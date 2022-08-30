const router = require("express").Router()
const bcrypt = require("bcrypt");
const jwtGenerator = require("../utils/jwtGenerator")
const authorization = require("../middleware/authorization");

const pool = require("../db");
const {registerValidation, userValidationResult, loginValidation} = require("../validation/userValidation");
const {cloudinary} = require("../utils/cloudinarySetup");
const upload = require("../utils/multer");

//registering
//TODO ADD back registerValidation, userValidationResult
router.post("/register", upload.single('image'), async (req, res) => {
    const {name, email, password, city, country} = req.body;

    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length !== 0) {
            return res.status(401).send("User already exists") // 401 person is unauthenticated, 403 they are not authorised to entere that data
        }

        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const uploadImage = await cloudinary.uploader.upload(req.file.path);
        const avatar = uploadImage.url;

        const newUser = await pool.query("INSERT INTO users (name, profile_picture, email, password, city, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [name, avatar, email, bcryptPassword, city, country]);
        const token = jwtGenerator(newUser.rows[0].id);
        return res.json({token});
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Register failed");
    }
})

router.post("/login", loginValidation, userValidationResult, async (req, res) => {
    const {email, password} = req.body

    try {

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json("Password or email is incorrect.")
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password)
        if (!validPassword) {
            return res.status(401).json("Password or email is incorrect.")
        }

        const token = jwtGenerator(user.rows[0].id)
        return res.json({token});

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Login failed");
    }
})

router.get("/currentUser", authorization, async (req, res) => {
    try {
        const user = await pool.query("SELECT name, email, id, profile_picture, city, country FROM users WHERE id=$1", [req.user]);
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
})

router.get("/getById/:id", async (req, res) => {
    const user_id = req.params.id
    try{
        const user = await pool.query("SELECT profile_picture, name, city, country FROM users WHERE id = $1", [user_id])
        res.json(user.rows)
    }catch(err){
        console.error(err.message)
        res.status(500).send("Couldn't fetch user.")
    }
})

router.patch("/updateInfo", upload.single('image'), authorization, async (req, res) => {
    const user_id = req.user
    const { name, email, city, country} = req.body
    try{

        const user = await pool.query("SELECT * FROM users WHERE id = $1", [user_id]);

        if (user.rows.length === 0) {
            return res.status(401).json("User doesn't exist.")
        }

        await pool.query("UPDATE users SET name = $1, email = $2, city = $3, country = $4 WHERE id = $5",
            [name, email, city, country, user_id])
        res.json({success: "Profile updated."});
    }catch(err){
        console.error(err.message)
        res.status(500).send("Couldn't update profile.")
    }
})

router.patch("/updatePassword", authorization, async(req, res) => {
    const user_id = req.user
    const { current_password, new_password} = req.body
    try{
        const user_password = await pool.query("SELECT password FROM users WHERE id = $1", [user_id])
        if(user_password.length === 0){
            return res.status(401).json("User doesn't exist.")
        }
        const result = bcrypt.compareSync(current_password, user_password.rows[0].password);
        if (!result) {
            return res.status(401).json("Passwords don't match.")
        }

        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(new_password, salt);

        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [bcryptPassword, user_id])
        res.json({success: "Password updated."});
    }catch(err){
        console.error(err.message)
        res.status(500).send("Couldn't update password.")
    }
})

router.patch("/updateProfilePicture", upload.single('image'), authorization, async(req, res) => {
    const user_id = req.user
    try{
        const user = await pool.query("SELECT * FROM users WHERE id = $1", [user_id]);

        if (user.rows.length === 0) {
            return res.status(401).json("User doesn't exist.")
        }
        const uploadImage = await cloudinary.uploader.upload(req.file.path);
        const avatar = uploadImage.url;

        await pool.query("UPDATE users SET profile_picture = $1 WHERE id = $2",
            [avatar, user_id])
        res.json({success: "Profile updated."});
    }catch(err){
            console.error(err.message)
            res.status(500).send("Couldn't update picture.")
        }
})

router.get("/getProfilePic", upload.single('image'), authorization, async(req, res) => {
    try {
        const profilePicture = await pool.query("SELECT profile_picture FROM users WHERE id=$1", [req.user]);
        res.json(profilePicture.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
})


module.exports = router;