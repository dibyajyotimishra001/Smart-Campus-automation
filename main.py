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