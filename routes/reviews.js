const router = require("express").Router()
const authorization = require("../middleware/authorization");
const pool = require("../db");

router.post("/add/:id", authorization, async(req, res) => {
    const review_by_id = req.user
    const person_reviewed_id = req.params.id
    const { grade, review, deed_id } = req.body

    try{
        await pool.query("INSERT INTO reviews (review_by_id, person_reviewed_id, grade, review) VALUES ($1, $2, $3, $4)",
            [review_by_id, person_reviewed_id, grade, review])
        await pool.query("UPDATE attendants SET review_done = true WHERE deed_id = $1 AND user_id=$2",
            [deed_id, review_by_id])
        res.json({success: "true"})
    }catch (err){
        console.error(err.message)
        res.status(500).send("Couldn't add review.")
    }
})

router.get("/get/:id", async(req, res) => {
    const person_reviewed_id = req.params.id
    try{
        const reviews = await pool.query("SELECT users.id as user_id, users.name, users.profile_picture, grade, review FROM reviews INNER JOIN users ON reviews.review_by_id = users.id WHERE person_reviewed_id = $1",
            [person_reviewed_id])
        res.json(reviews.rows)
    }catch(err){
        console.error(err.message)
        res.status(500).send("Couldn't fetch reviews")
    }
})

router.get("/notifications", authorization, async(req, res) =>{
    const user_id = req.user
    try{
        const notifications = await pool.query("SELECT deeds.name, deeds.id FROM deeds INNER JOIN attendants ON deeds.id = attendants.deed_id WHERE attendants.user_id = $1 AND attendants.review_done = false AND deeds.completed = true",
            [user_id])
        res.json(notifications.rows)
    }catch(err){
        console.error(err.message)
        res.status(500).send("Couldn't fetch notifications")
    }
})

module.exports = router;