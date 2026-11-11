from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MONGO_URL = "mongodb+srv://mishradibyajyoti011_db_user:raj@cluster0.hwomcto.mongodb.net/"
client = MongoClient(MONGO_URL)
db = client.smart_campus


@app.get("/api/structure")
def get_campus_structure():
   
    raw_data = list(db.data_set_1.find({}, {"course": 1, "semester": 1, "section": 1, "_id": 0}))
    
    campus_data = {}
    
    for doc in raw_data:
        c = doc.get("course")
        sem = doc.get("semester")
        sec = doc.get("section")
        
       
        if c not in campus_data:
            campus_data[c] = {"semesters": [], "sections": {}}
            
        
        if sem not in campus_data[c]["semesters"]:
            campus_data[c]["semesters"].append(sem)
            campus_data[c]["sections"][sem] = []
            
        
        if sec not in campus_data[c]["sections"][sem]:
            campus_data[c]["sections"][sem].append(sec)
            
    return {"status": "success", "data": campus_data}


@app.get("/api/timetable")
def get_timetable(course: str, semester: str, section: str):
    
    query = {"course": course, "semester": semester, "section": section}
    
    
    raw_data = list(db.data_set_1.find(query))
    
    
    for item in raw_data:
        item["_id"] = str(item["_id"])
        
    return {"status": "success", "data": raw_data}