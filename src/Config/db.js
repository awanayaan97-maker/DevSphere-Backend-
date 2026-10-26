
const mongoose = require("mongoose");

async function connectDB() {
    
    try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("DB is Connected Sucessfully");
    
    } 
    
    catch (error) {
    console.log(error.message);
    }

}

module.exports = connectDB