from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from datetime import datetime, timedelta
import jwt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = "mongodb+srv://mishradibyajyoti011_db_user:raj@cluster0.hwomcto.mongodb.net/"

client = MongoClient(
    MONGO_URL, 
    serverSelectionTimeoutMS=5000,
    tlsAllowInvalidCertificates=True
)

db = client.smart_campus

try:
    client.admin.command('ping')
    print("Database Connected Successfully!")
except OperationFailure as e:
    print(f"Authentication Failed (Check username/password): {e}")
except ConnectionFailure as e:
    print(f"Network/IP Whitelist Error: {e}")
except Exception as e:
    print(f"Database Error: {e}")


@app.get("/api/structure")
def get_campus_structure():
    try:
        raw_data = list(db.data_set_1.find({}, {"course": 1, "semester": 1, "section": 1, "_id": 0}))
        campus_data = {}
        
        for doc in raw_data:
            c = doc.get("course")
            sem = str(doc.get("semester"))
            sec = doc.get("section")
            
            if not c or not sem or not sec:
                continue
                
            if c not in campus_data:
                campus_data[c] = {"semesters": [], "sections": {}}
                
            if sem not in campus_data[c]["semesters"]:
                campus_data[c]["semesters"].append(sem)
                campus_data[c]["sections"][sem] = []
                
            if sec not in campus_data[c]["sections"][sem]:
                campus_data[c]["sections"][sem].append(sec)
                
        return {"status": "success", "data": campus_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/timetable")
def get_timetable(course: str, semester: str, section: str):
    sem_query = {"$in": [semester, int(semester)]} if semester.isdigit() else semester
    query = {"course": course.lower(), "semester": sem_query, "section": section}
    
    raw_data = list(db.data_set_1.find(query))
    
    for item in raw_data:
        item["_id"] = str(item["_id"])
        
    return {"status": "success", "data": raw_data}


@app.get("/api/faculty")
def get_faculty():
    try:
        raw_data = list(db.data_set_1.find())
        faculty_data = {}

        for doc in raw_data:
            course = doc.get("course")
            semester = doc.get("semester")
            section = doc.get("section")
            for day, classes in doc.get("schedule", {}).items():
                for item in classes:
                    faculty = item.get("faculty", {})
                    fid = faculty.get("id")

                    if not fid:
                        continue
                    if fid not in faculty_data:
                        faculty_data[fid] = {
                            "faculty_id": fid,
                            "faculty_name": faculty.get("name"),
                            "classes": []
                        }

                    faculty_data[fid]["classes"].append({
                        "course": course,
                        "semester": semester,
                        "section": section,
                        "day": day.strip(),
                        "subject": item.get("subject", {}).get("name"),
                        "time": item.get("time_range"),
                        "room": item.get("room", {}).get("number")
                    })

        return {
            "status": "success",
            "data": list(faculty_data.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rooms")
def get_rooms():
    try:
        pipeline = [
            {
                "$project": {
                    "_id": 0,
                    "course": 1,
                    "semester": 1,
                    "section": 1,
                    "schedule": {"$objectToArray": "$schedule"}
                }
            },
            {"$unwind": "$schedule"},
            {"$unwind": "$schedule.v"},
            {
                "$match": {
                    "schedule.v.room.number": {"$exists": True, "$nin": [None, ""]}
                }
            },
            {
                "$group": {
                    "_id": "$schedule.v.room.number",
                    "capacity": {"$first": "$schedule.v.room.capacity"},
                    "classes": {
                        "$push": {
                            "course": "$course",
                            "semester": "$semester",
                            "section": "$section",
                            "day": {"$trim": {"input": "$schedule.k"}},
                            "subject": "$schedule.v.subject.name",
                            "time": "$schedule.v.time_range"
                        }
                    }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "room_number": "$_id",
                    "capacity": 1,
                    "classes": 1
                }
            }
        ]

        return {
            "status": "success",
            "data": list(db.data_set_1.aggregate(pipeline))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rooms/{room_number}/timetable")
def get_room_timetable(room_number: str):
    try:
        raw_data = list(db.data_set_1.find())
        room_classes = []

        for doc in raw_data:
            for day, classes in doc.get("schedule", {}).items():
                for item in classes:
                    room = item.get("room", {})
                    if room.get("number") == room_number:
                        room_classes.append({
                            "room": room_number,
                            "course": doc.get("course"),
                            "semester": doc.get("semester"),
                            "section": doc.get("section"),
                            "day": day.strip(),
                            "subject": item.get("subject", {}).get("name"),
                            "faculty": item.get("faculty", {}).get("name"),
                            "time": item.get("time_range")
                        })

        if not room_classes:
            raise HTTPException(status_code=404, detail="Room not found")

        return {"status": "success", "data": room_classes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_all_classes():
    raw_data = list(db.data_set_1.find())
    all_classes = []

    for doc in raw_data:
        course = doc.get("course")
        semester = doc.get("semester")
        section = doc.get("section")

        for day, classes in doc.get("schedule", {}).items():
            for item in classes:
                class_entry = dict(item)
                class_entry["course"] = course
                class_entry["semester"] = semester
                class_entry["section"] = section
                class_entry["day"] = day.strip()
                all_classes.append(class_entry)

    return all_classes


def find_conflicts(classes):
    conflicts = []
    faculty_tracker = {}
    room_tracker = {}

    for item in classes:
        day = item.get("day", "").strip()
        time_range = item.get("time_range", "").strip()
        
        if not day or not time_range:
            continue

        batch_label = f"{str(item.get('course', '')).upper()} Sem-{item.get('semester')} ({item.get('section')})"

        faculty = item.get("faculty") or {}
        fid = faculty.get("id")
        if fid:
            f_key = (fid, day, time_range)
            if f_key in faculty_tracker:
                conflicts.append({
                    "type": "Faculty Conflict",
                    "entity": faculty.get("name", fid),
                    "day": day,
                    "time": time_range,
                    "clash_between": [faculty_tracker[f_key], batch_label]
                })
            else:
                faculty_tracker[f_key] = batch_label

        room = item.get("room") or {}
        r_num = room.get("number")
        if r_num:
            r_key = (r_num, day, time_range)
            if r_key in room_tracker:
                conflicts.append({
                    "type": "Room Conflict",
                    "entity": f"Room {r_num}",
                    "day": day,
                    "time": time_range,
                    "clash_between": [room_tracker[r_key], batch_label]
                })
            else:
                room_tracker[r_key] = batch_label

    return conflicts


@app.get("/api/dashboard")
@app.get("/api/dashboard/stats")
def dashboard_stats() -> dict:
    try:
        classes = get_all_classes()
        faculty_ids = set()
        room_numbers = set()

        for item in classes:
            faculty = item.get("faculty") or {}
            room = item.get("room") or {}

            if faculty.get("id"):
                faculty_ids.add(faculty.get("id"))
            if room.get("number"):
                room_numbers.add(room.get("number"))

        conflicts = find_conflicts(classes)

        return {
            "status": "success",
            "data": {
                "total_classes": len(classes),
                "total_faculty": len(faculty_ids),
                "total_classrooms": len(room_numbers),
                "total_conflicts": len(conflicts)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conflicts")
def get_conflicts():
    try:
        classes = get_all_classes()
        return {
            "status": "success",
            "data": find_conflicts(classes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ADMIN AUTHENTICATION & TIMETABLE UPDATE
# ==========================================

SECRET_KEY = "smart_campus_enterprise_jwt_secret_key"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/login")

class LoginData(BaseModel):
    username: str
    password: str

class UpdateScheduleData(BaseModel):
    course: str
    semester: str
    section: str
    day: str
    slot: int
    new_subject: dict
    new_faculty: dict
    new_room: dict

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=4)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_admin(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role != "administrator":
            raise HTTPException(status_code=401, detail="Unauthorized: Admin access required")
        return username
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

@app.post("/api/admin/login")
def admin_login(data: LoginData):
    if data.username.strip() == "admin_dibya" and data.password.strip() == "dibya123":
        token = create_access_token({"sub": "admin_dibya", "role": "administrator"})
        return {"status": "success", "access_token": token, "token_type": "bearer"}
    
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.get("/api/admin/verify")
def check_admin_session(admin: str = Depends(verify_admin)):
    return {"status": "success", "admin": admin}

@app.put("/api/timetable/update")
def update_timetable(data: UpdateScheduleData, admin: str = Depends(verify_admin)):
    try:
        sem_query = {"$in": [data.semester, int(data.semester)]} if data.semester.isdigit() else data.semester
        query = {
            "course": data.course.lower(),
            "semester": sem_query,
            "section": data.section
        }
        
        update_path = f"schedule.{data.day}.$[elem]"
        update_query = {
            "$set": {
                f"{update_path}.subject": data.new_subject,
                f"{update_path}.faculty": data.new_faculty,
                f"{update_path}.room": data.new_room
            }
        }
        array_filters = [{"elem.slot": data.slot}]
        
        result = db.data_set_1.update_one(query, update_query, array_filters=array_filters)
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Target schedule slot not found in database")
            
        return {
            "status": "success",
            "message": f"Timetable updated for {data.course.upper()} Sem-{data.semester} ({data.section}) on {data.day}, Slot {data.slot}."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))