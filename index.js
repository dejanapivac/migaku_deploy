const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path")
const PORT = process.env.PORT || 5000;

app.use(express.json())
app.use(cors())

if(process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname, "client/dist")))
}

//ROUTES
app.use("/auth", require("./routes/auth"))
app.use("/deeds", require("./routes/deeds"))
app.use("/reviews", require("./routes/reviews"))
app.use("/deed/comments", require("./routes/comments"))

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client/dist/index.html"))
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})