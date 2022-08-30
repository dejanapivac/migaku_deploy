const router = require("express").Router()
const authorization = require("../middleware/authorization");

const pool = require("../db");
const {cloudinary} = require("../utils/cloudinarySetup");
const upload = require("../utils/multer");

router.post("/add", authorization, upload.single('image'), async (req, res) => {
    const current_user_id = req.user;
    const {name, category, street, streetNumber, zipCode, city, country, start_time, description} = req.body;
    try {
        const uploadImage = await cloudinary.uploader.upload(req.file.path);
        const avatar = uploadImage.url;
        const deed = await pool.query("INSERT INTO deeds (creator_user_id, image, name, category, street, streetNumber, zipCode, city, country, start_time, description) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9,$10, $11) RETURNING *", [current_user_id, avatar, name, category, street, streetNumber, zipCode, city, country, start_time, description]);
        const deedRow = deed.rows[0]
        const user = await pool.query("SELECT name FROM users WHERE id = $1", [current_user_id]);
        const deedInfo = {
            category: deedRow.category,
            deed_id: deedRow.id,
            deedcity: deedRow.city,
            deedcountry: deedRow.country,
            deedname: deedRow.name,
            image: deedRow.image,
            name: user.rows[0].name,
            start_time: deedRow.start_time,
            street: deedRow.street,
            streetNumber: deed.streetNumber,
            user_id: current_user_id,
            zipcode: deedRow.zipCode
        }

        res.json(deedInfo);
    } catch (err) {
        console.error(err.message)
        res.status(500).send("New deed save unsuccessful");
    }
})

router.get("/getNearbyDeeds", authorization, async (req, res) => {
    const user_id = req.user;
    try {
        const user = await pool.query("SELECT city, country from users WHERE id = $1", [user_id])
        const userCity = user.rows[0].city
        const userCountry = user.rows[0].country
        const nearbyDeeds = await pool.query("SELECT users.id as user_id, users.name as name, deeds.id as deed_id, image, deeds.name as  deedName, category, street, streetNumber, zipCode, deeds.city as deedCity, deeds.country as deedCountry, start_time, deeds.description FROM deeds INNER JOIN users ON deeds.creator_user_id = users.id WHERE deeds.city = $1 AND deeds.country = $2 AND completed = false", [userCity, userCountry])
        res.json(nearbyDeeds.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Can't fetch nearby deeds");
    }
})

router.get("/searchedCity", async (req, res) => {
    const searched_city = req.query.searched_city
    const country = req.query.country
    try {
        const eventsInSearchedCity = await pool.query("SELECT users.id as user_id, users.name as name, deeds.id as deed_id, image, deeds.name as  deedName, category, street, streetNumber, zipCode, deeds.city as deedCity, deeds.country as deedCountry, start_time FROM deeds INNER JOIN users ON deeds.creator_user_id = users.id WHERE deeds.city = $1 AND deeds.country = $2", [searched_city, country])
        res.json(eventsInSearchedCity.rows);
    } catch (err) {
        console.error(err.message)
        res.status(500).send("")
    }
})

//user is going on event
router.post("/attendEvent/:id", authorization, async (req, res) => {
    const user_id = req.user;
    const deed_id = req.params.id;

    try {
        const going = await pool.query("SELECT * FROM attendants WHERE user_id = $1 AND deed_id = $2", [user_id, deed_id])
        if (going.rows.length !== 0) {
            await pool.query("DELETE FROM attendants WHERE user_id = $1 AND deed_id = $2", [user_id, deed_id]);
            return res.json({success: "Not attending event"});
        }

        await pool.query("INSERT INTO attendants (user_id, deed_id) VALUES ($1, $2)", [user_id, deed_id]);
        res.json({success: "Added event attendant"});
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Unable to add attendee.")
    }
})

router.get("/isAttending/:id", authorization, async (req, res) => {
    const deed_id = req.params.id
    const user_id = req.user
    try {
        const going = await pool.query("SELECT * FROM attendants WHERE user_id = $1 AND deed_id = $2", [user_id, deed_id])
        if (going.rows.length !== 0) {
            res.json({going: "true"})
        } else {
            res.json({going: "false"})
        }
    } catch (err) {
        console.error(err)
        res.status(500).send("")
    }
})

//all deeds user attended
router.get("/attended/:id", async (req, res) => {
    const user_id = req.params.id;
    try {
        const attended = await pool.query("SELECT users.id as user_id, deeds.id as deed_id, image, deeds.name AS deedName, category, street, streetNumber, zipCode, deeds.city AS deedCity, deeds.country AS deedCountr, start_time, users.name, deeds.description FROM deeds INNER JOIN attendants ON deeds.id = attendants.deed_id INNER JOIN users ON deeds.creator_user_id = users.id WHERE attendants.user_id = $1", [user_id])
        res.json(attended.rows)
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Couldn't fetch attended deeds.")
    }
})

//events user created
router.get("/created/:id", async (req, res) => {
    const user_id = req.params.id;
    try {
        const created = await pool.query("SELECT users.id as user_id, deeds.id as deed_id, image, deeds.name AS deedName, category, street, streetNumber, ZipCode, deeds.city AS deedCity, deeds.country AS deedCOuntry, start_time, users.name, deeds.description FROM deeds INNER JOIN users ON deeds.creator_user_id = users.id WHERE deeds.creator_user_id = $1", [user_id])
        res.json(created.rows)
    } catch (err) {
        console.log(err.message);
        res.status(500).send("Couldn't fetch created deeds.")
    }
})

//event creator completes event
router.patch("/complete/:id", authorization, async (req, res) => {
    const user_id = req.user;
    const deed_id = req.params.id
    try {
        await pool.query("UPDATE deeds SET completed = true WHERE id = $1 AND deeds.creator_user_id = $2", [deed_id, user_id])
        res.json({success: "Deed completed."});
    } catch (err) {
        console.log(err.message);
        res.status(500).send("Couldn't complete event.")
    }
})

//used to get list of attendees in expanded event
router.get("/getAttendees/:id", async (req, res) => {
    const deed_id = req.params.id
    try {
        const attendees = await pool.query("SELECT users.profile_picture, users.name, users.id FROM users INNER JOIN attendants ON users.id = attendants.user_id WHERE attendants.deed_id = $1", [deed_id])
        res.json(attendees.rows)
    } catch (err) {
        console.error(err.message)
        res.status(500).send("Couldn't fetch number of attendees.")
    }
})

router.get("/getReviewers/:id", authorization, async (req, res) => {
    const deed_id = req.params.id
    const userId = req.user
    try {
        const reviewers = await pool.query("SELECT users.profile_picture, users.name, users.id FROM users INNER JOIN attendants ON users.id = attendants.user_id WHERE attendants.deed_id = $1", [deed_id])
        const filteredReviewers = reviewers.rows.filter(reviewer => reviewer.id != userId)
        res.json(filteredReviewers)
    } catch (err) {
        console.error(err.message)
        res.status(500).send("Couldn't fetch number of attendees.")
    }
})

router.get("/isCompleted/:id", async (req, res) => {
    const deed_id = req.params.id
    try {
        const completed = await pool.query("SELECT completed FROM deeds WHERE id = $1 AND completed = 'true'", [deed_id])
        if (completed.rows.length !== 0) {
            res.json({completed: "true"})
        } else {
            res.json({completed: "false"})
        }
    } catch (err) {
        console.error(err)
        res.status(500).send("")
    }
})

module.exports = router;