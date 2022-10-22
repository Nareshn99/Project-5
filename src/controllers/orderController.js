const { isValidObjectId, isValidStatus, isValidBody, isValid } = require('../utils/validation')
const cartModel = require("../models/cartModel");
const userModel = require('../models/userModel');
const orderModel = require("../models/orderModel");

const createOrder = async function (req, res) {
    try {
        let userId = req.params.userId;
        let data = req.body;
        let { cancellable, status } = data;
        data.userId = userId

        let dataFromCart = await cartModel.findOne({ userId })
        if (!dataFromCart) {
            return res.status(404).send({ status: false, message: "Cart not found" })
        }
        //add data in body from cart
        data.items = dataFromCart.items
        if (dataFromCart.items.length == 0) {
            return res.status(404).send({ status: false, message: "Items not found" })
        }
        data.totalPrice = dataFromCart.totalPrice
        data.totalItems = dataFromCart.totalItems
        let quantityTotal = 0
        for (let i = 0; i < dataFromCart.items.length; i++) {
            quantityTotal += dataFromCart.items[i].quantity
        }
        data.totalQuantity = quantityTotal

        //validation for cancellable and status
        if (cancellable) {
            if (typeof cancellable !== "boolean") {
                return res.status(400).send({ status: false, message: "cancellable Boolean only" })
            };
        }
        if (status) {
            if (!isValidStatus(status)) {
                return res.status(400).send({ status: false, message: "Status can only contain pending,completed,cancelled" })
            }
        } else {
            data.status = "pending"
        }
        await cartModel.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0, totalItems: 0 } })
        let result = await orderModel.create(data);
        return res.status(201).send({ status: true, message: "Success", data: result });
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


const updateOrder = async function (req, res) {
    try {
        userId = req.params.userId
        body = req.body

        if (!isValidBody(body)) {
            return res.status(400).send({ status: false, message: "body should not be empty" })
        }
        let { orderId, status } = body
        if (!isValid(orderId))
            return res.status(400).send({ status: false, msg: "orderId is required" })
        if (!isValidObjectId(orderId))
            return res.status(400).send({ status: false, msg: `orderId ${orderId} is invalid` });

        let findOrder = await orderModel.findOne({_id:orderId,isDeleted:false})
        if (!findOrder) return res.status(404).send({ status: false, message: "No order found with the give orderId" })

        if (findOrder.userId!= userId) return res.status(403).send({ status: false, message: "This order doesnot belongs to your account" })

        if (status == "cancelled") {

            if (findOrder.cancellable == false) return res.status(400).send({ status: false, message: "You can't cancel this order" })

            if (findOrder.status == "cancelled") return res.status(400).send({ status: false, message: "This order is already cancelled" })

            let updateOrder = await orderModel.findOneAndUpdate({ _id: orderId }, { status: "cancelled" }, { new: true })
            return res.status(200).send({ status: true, message: "Success", data: updateOrder })
        }
        if (status == "completed") {

            if (findOrder.status == "completed") return res.status(400).send({ status: false, message: "This order is already completed" })

            if (findOrder.status == "cancelled") return res.status(400).send({ status: false, message: "This order is already cancelled , after cancellation you can't update it to completed" })

            let updateOrder = await orderModel.findOneAndUpdate({ _id: orderId }, { status: "completed" }, { new: true })
            return res.status(200).send({ status: true, message: "Success", data: updateOrder })

        }
        if (status == "pending") {
            if (findOrder.status == "pending") return res.status(400).send({ status: false, message: "This order is already in pending" })

            if (findOrder.status == "cancelled") return res.status(400).send({ status: false, message: "This order is already cancelled , after cancellation you can't update it to pending" })

            if (findOrder.status == "completed") return res.status(400).send({ status: false, message: "This order is already completed, after completion you can't update it to pending" })

        }
    } catch (error) {
        res.status(500).send({ msg: "Error", error: error.message });
    }
};



module.exports = { createOrder, updateOrder }