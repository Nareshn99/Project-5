const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const aws = require("../utils/aws")
const jwt = require('jsonwebtoken')
const { isValidBody,isEmpty, isValidEmail, isValidPhone, isValidPassword, isValidPincode, isValidObjectId, isValidName } = require('../utils/validation')


const createUser = async (req, res) => {
    try {
        let { fname, lname, email, phone, password, profileImage, address } = req.body
        //validation for emptyBody
        if (!isValidBody(req.body)) {
            return res.status(400).send({ status: false, message: "Please Enter Some Input" });
        }
        if (!fname) {
            return res.status(400).send({ status: false, message: "fname Is Mandatory " });
        }
        if (!isValidName(fname)) {
            return res.status(400).send({ status: false, message: "fname should be alphabatical Order And String only" });
        }
        if (!lname) {
            return res.status(400).send({ status: false, message: "lname Is Mandatory " });
        }
        if (!isValidName(lname)) {
            return res.status(400).send({ status: false, message: "lname should be alphabatical Order And String only" });
        }
        //validation for email
        if (!email) {
            return res.status(400).send({ status: false, message: "email Is Mandatory " });
        }
        if (!isValidEmail(email)) {
            return res.status(400).send({ status: false, message: "Invalid Email" });
        }
        //validation for phone 
        if (!phone) {
            return res.status(400).send({ status: false, message: "phone Is Mandatory" });
        }
        if (!isValidPhone(phone)) {
            return res.status(400).send({ status: false, message: "Invalid phone" });
        }
        // Check for the uniqueness of email and phone
        let user = await userModel.find({ $or: [{ email }, { phone }] })
        for (let key of user) {
            if (key.email == email.trim().toLowerCase()) {
                return res.status(409).send({ status: false, message: "Given email is already taken" })
            }
            if (key.phone == phone) {
                return res.status(409).send({ status: false, message: "Given phone is already taken" })
            }
        }
        //validation for password
        if (!password) {
            return res.status(400).send({ status: false, message: "password Is Mandatory" });
        }
        if (!isValidPassword(password)) {
            return res.status(400).send({ status: false, message: "Weak Password,Minimum eight and maximum 15 characters, at least one uppercase letter, one lowercase letter, one number and one special character" })
        }
        //bcrypt password
        const hashedPassword = await bcrypt.hash(password, 10)

        //validation for address
        if (!address) {
            return res.status(400).send({ status: false, message: "Address Is Mandatory" });
        }
        try {
            address = JSON.parse(address)
            if (typeof (address) !== "object" || Object.keys(address).length == 0) {
                return res.status(400).send({ status: false, message: "Address cant empty / Object type only " })
            }
            let { shipping, billing } = address
            // //vlidation for shipping
            if (!shipping) {
                return res.status(400).send({ status: false, message: "shipping Is Mandatory" });
            }
            if (typeof (shipping) !== "object" || !isValidBody(billing)) {
                return res.status(400).send({ status: false, message: "shipping cant empty / Object type only " })
            }
            if (!isEmpty(shipping.street)) {
                return res.status(400).send({ status: false, message: "street Is Mandatory/String only" });
            }
            if (!isEmpty(shipping.city)) {
                return res.status(400).send({ status: false, message: "city Is Mandatory/String only" });
            }
            if (!shipping.pincode) {
                return res.status(400).send({ status: false, message: "pincode Is Mandatory" });
            }
            if (!isValidPincode(shipping.pincode)) {
                return res.status(400).send({ status: false, msg: "Invalid pincode / Numbers only" })
            }
            //validation for billing
            if (!billing) {
                return res.status(400).send({ status: false, message: "billing is Mandatory " })
            }
            if (typeof (billing) !== "object" || !isValidBody(billing)) {
                return res.status(400).send({ status: false, message: "billing cant empty / Object type only " })
            }
            if (!isEmpty(billing.street)) {
                return res.status(400).send({ status: false, message: "street Is Mandatory/String only" });
            }
            if (!isEmpty(billing.city)) {
                return res.status(400).send({ status: false, message: "city Is Mandatory/String only" });
            }
            if (!billing.pincode) {
                return res.status(400).send({ status: false, message: "pincode Is Mandatory" });
            }
            if (!isValidPincode(billing.pincode)) {
                return res.status(400).send({ status: false, msg: "Invalid pincode / Numbers only" })
            }

            //validation for profileImage
            //creating AWS link
            let file = req.files;
            if (file && file.length > 0) {
                const url = await aws.uploadFile(file[0]);
                profileImage = url
            } else {
                return res.status(400).send({ status: false, message: "ProfileImage Is Mandatory" });
            }
            //create document
            let dataCreted = { fname, lname, email, phone, profileImage, address }
            dataCreted.password = hashedPassword
            let data = await userModel.create(dataCreted)
            return res.status(201).send({ status: true, message: "User created successfully", data: data });
        }
        catch (err) {
            return res.status(400).send({ status: false, message: "address is only in JSON" });
        }
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}



const login = async (req, res) => {
    try {
        let data = req.body;
        let { email, password } = data

        //validation for emptyBody
        if (!isValidBody(req.body)) {
            return res.status(400).send({ status: false, message: "Please Enter Some Input" });
        }
        //validation for email
        if (!email) {
            return res.status(400).send({ status: false, message: "email Is Mandatory " });
        }
        if (!isValidEmail(email)) {
            return res.status(400).send({ status: false, message: "Invalid Email" });
        }
        //validation for password
        if (!password) {
            return res.status(400).send({ status: false, message: "password Is Mandatory" });
        }
        //find user from dataBase
        let user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" });
        }
        let correctPass = await bcrypt.compare(password, user.password)
        if (!correctPass) {
            return res.status(400).send({ status: false, message: "Invalid Password" });
        }
        let userId = user._id;
        const token = jwt.sign({ userId: userId }, "narshdnfjdfnfvnfn", { expiresIn: "1d" });
        res.status(200).send({ status: true, message: "User logged in successfully", data: { userId: userId, token } });
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};



const getUser = async (req, res) => {
    try {
        let userId = req.params.userId
        let findUser = await userModel.findById(userId)
        return res.status(200).send({ status: true, message: "User profile details", data: findUser })
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}



const updateUser = async (req, res) => {
    try {
        let userId = req.params.userId

        let findUser = await userModel.findById(userId)
        let { fname, lname, email, phone, password, profileImage, address } = req.body

        //validation for emptyBody
        if (!isValidBody(req.body)) {
            return res.status(400).send({ status: false, message: "Please Enter Some Input" });
        }

        if (fname) {
            if (!isValidName(fname)) {
                return res.status(400).send({ status: false, message: "fname Is Invalid/String only" });
            }
        }
        if (lname) {
            if (!isValidName(lname)) {
                return res.status(400).send({ status: false, message: "lname Is Invalid/String only" });
            }
        }
        //validation for email
        if (email) {
            if (!isValidEmail(email)) {
                return res.status(400).send({ status: false, message: "Invalid Email" });
            }
        }
        //validation for phone 
        if (phone) {
            if (!isValidPhone(phone)) {
                return res.status(400).send({ status: false, message: "Invalid phone" });
            }
        }
        // Check for the uniqueness of email and phone
        let user = await userModel.find({ $or: [{ email }, { phone }] })
        for (let key of user) {
            if (key.email == email.trim().toLowerCase()) {
                return res.status(409).send({ status: false, message: "Given email is already taken" })
            }
            if (key.phone == phone) {
                return res.status(409).send({ status: false, message: "Given phone is already taken" })
            }
        }
        //validation for password
        if (password) {
            if (!isValidPassword(password)) {
                return res.status(400).send({ status: false, message: "Password is in Invalid formate,Minimum eight and maximum 15 characters, at least one uppercase letter, one lowercase letter, one number and one special character" })
            }
            var hashedPassword = await bcrypt.hash(password, 10)
        }

        //validation for address
        if (address) {
            try {
                address = JSON.parse(address)
                if (typeof address !== "object" || !isValidBody(address)) {
                    return res.status(400).send({ status: false, message: "Address cant empty / Object type only " })
                }
                let { shipping, billing } = address

                // //vlidation for shipping
                if (!shipping) {
                    address.shipping = findUser.address.shipping

                } else {
                    if (typeof shipping !== "object" || !isValidBody(shipping)) {
                        return res.status(400).send({ status: false, message: "shipping cant empty / Object type only " })
                    }
                    if (!isEmpty(shipping.street)) {
                        return res.status(400).send({ status: false, message: "street Is Invalid/String only" });
                    }
                    if (!isEmpty(shipping.city)) {
                        return res.status(400).send({ status: false, message: "city Is Invalid/String only" });
                    }
                    if (!isValidPincode(shipping.pincode)) {
                        return res.status(400).send({ status: false, msg: "Invalid pincode / Numbers only" })
                    }
                }
                //validation for billing
                if (!billing) {
                    address.billing = findUser.address.billing
                } else {
                    if (typeof billing !== "object" || !isValidBody(billing)) {
                        return res.status(400).send({ status: false, message: "billing cant empty / Object type only " })
                    }
                    if (!isEmpty(billing.street)) {
                        return res.status(400).send({ status: false, message: "street Is Invalid/String only" });
                    }
                    if (!isEmpty(billing.city)) {
                        return res.status(400).send({ status: false, message: "city Is Invalid/String only" });
                    }
                    if (!isValidPincode(billing.pincode)) {
                        return res.status(400).send({ status: false, msg: "Invalid pincode / Numbers only" })
                    }
                }
            }
            catch (error) {
                return res.status(400).send({ status: false, message: "Address only in JSON" })
            }
        }

        //validation for profileImage
        //creating AWS link
        let file = req.files;
        if (profileImage) {
            if (file && file.length > 0) {
                const url = await aws.uploadFile(file[0]);
                profileImage = url
            } else {
                return res.status(400).send({ status: false, message: "ProfileImage not added" });
            }
        }
        //update Document
        let dataUpdated = { fname, lname, email, phone, profileImage, address }
        dataUpdated.password = hashedPassword
        let data = await userModel.findOneAndUpdate({ _id: userId }, { $set: dataUpdated }, { new: true })
        return res.status(200).send({ status: true, message: "User profile updated", data: data });

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}



module.exports = {
    createUser,
    login,
    getUser,
    updateUser
}