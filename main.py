from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = "mongodb+srv://mishradibyajyoti011_db_user:raj@cluster0.hwomcto.mongodb.net/"

# Connect with a 5-second timeout and TLS fallback to catch errors immediately
client = MongoClient(
    MONGO_URL, 
    serverSelectionTimeoutMS=5000,
    tlsAllowInvalidCertificates=True
)

db = client.smart_campus

# Verify connection on startup
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
            sem = str(doc.get("semester")) # Convert to string in case DB stores int
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
    # Handle both string and integer semester types in MongoDB
    sem_query = {"$in": [semester, int(semester)]} if semester.isdigit() else semester
    query = {"course": course, "semester": sem_query, "section": section}
    
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
        raise HTTPException (status_code=500, detail=str(e))
@app.get("/api/rooms")
def get_rooms():
    try:
        # Execute unwrapping, filtering, and grouping directly inside MongoDB's native engine
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
            raise HTTPException(
                status_code=404,
                detail="Room not found"
            )

        return {
            "status": "success",
            "data": room_classes
        }
    except Exception as e:
        raise HTTPException (status_code=500, detail=str(e))


@app.get("/api/dashboard")
def dashboard_stats() -> dict:
    try:
        classes = get_all_classes()

        faculty_ids = set()
        room_numbers = set()

        for item in classes:

            faculty = item.get("faculty") or {}
            room = item.get("room") or {}

            faculty_id = faculty.get("id")

            if faculty_id:
                faculty_ids.add(faculty_id)

            room_number = room.get("number")

            if room_number:
                room_numbers.add(room_number)

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
        raise HTTPException (status_code=500, detail=str(e))

