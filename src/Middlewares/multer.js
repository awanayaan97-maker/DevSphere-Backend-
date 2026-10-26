
const multer = require("multer");


const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "src/uploads")
    },

    filename: function(req, file, cb){
        cb(null, `${Date.now()}-${file.originalname}` )
    }
})

const fileFilter = (req, file, cb) => {
    
    console.log("Original Name:", file.originalname);
     console.log("MIME Type:", file.mimetype);
   if(file.mimetype.startsWith("image/")){
      cb(null, true)
   }

   else {
      cb(new Error("Only image files are allowed"), false)
   }
}

const upload = multer({
    storage: storage,
    limits: {fileSize: 1024 * 1024 * 4},
    fileFilter: fileFilter
})

module.exports = upload