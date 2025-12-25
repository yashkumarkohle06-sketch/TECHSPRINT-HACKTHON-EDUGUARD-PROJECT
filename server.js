const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());

// --- LOGIN SYSTEM WITH ROLES ---
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = JSON.parse(fs.readFileSync(path.join(__dirname,"users.json")));
  const user = users.find(u => u.email===email && u.password===password);
  if(!user) return res.status(401).json({message:"Invalid Credentials ❌"});
  res.json({ message:"Login Successful ✅", role:user.role });
});

// --- GOOGLE SHEETS SETUP ---
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname,"credentials.json"),
  scopes:["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({version:"v4", auth});
const SPREADSHEET_ID = "1egQ_iTgeaV5pfk6Q9U67JXD6ruK95XlYPUGkBnfDyKw"; // Replace with your sheet ID

// --- GET STUDENTS ---
app.get("/students", async (req,res)=>{
  try{
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range:"Sheet1!A2:E" // Name, Email, Course, Attendance, Remarks
    });
    res.json(data.data.values || []);
  } catch(err){ res.status(500).json({message:err.message}); }
});

// --- ADD STUDENT ---
app.post("/add-student", async (req,res)=>{
  const {name,email,course,attendance,remarks} = req.body;
  try{
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range:"Sheet1!A:E",
      valueInputOption:"USER_ENTERED",
      requestBody:{values:[[name,email,course,attendance,remarks]]}
    });
    res.json({message:"Student Added ✅"});
  } catch(err){ res.status(500).json({message:err.message}); }
});

// --- UPDATE STUDENT ---
app.put("/update-student/:row", async(req,res)=>{
  const row = req.params.row;
  const {name,email,course,attendance,remarks} = req.body;
  try{
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range:`Sheet1!A${row}:E${row}`,
      valueInputOption:"USER_ENTERED",
      requestBody:{values:[[name,email,course,attendance,remarks]]}
    });
    res.json({message:"Student Updated ✅"});
  } catch(err){ res.status(500).json({message:err.message}); }
});

// --- DELETE STUDENT ---
app.delete("/delete-student/:row", async(req,res)=>{
  const row = Number(req.params.row);
  try{
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId:SPREADSHEET_ID,
      requestBody:{
        requests:[{deleteDimension:{
          range:{sheetId:0,dimension:"ROWS",startIndex:row-1,endIndex:row}
        }}]
      }
    });
    res.json({message:"Student Deleted ✅"});
  } catch(err){ res.status(500).json({message:err.message}); }
});

// --- START SERVER ---
app.listen(5000,()=>console.log("Backend running at http://localhost:5000"));
