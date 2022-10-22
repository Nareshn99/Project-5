const cartModel = require('../models/cartModel');
const userModel = require('../models/userModel');
const productModel = require('../models/productModel');
const { isValidObjectId, isValidNum, isValidBody, isEmpty } = require('../utils/validation')

// ----------------------------------------------------------------------------------------
const createCart = async (req, res) => {
    try {
        let { cartId, productId, quantity } = req.body;
        let userId = req.params.userId;

        // validation for emptyBody
        if (!isValidBody(req.body)) {
            return res.status(400).send({ status: false, message: "Please Enter Some Input" });
        }
        
        let cartCreated = await cartModel.findOne({ userId });
        if (cartId) {
            if (!isValidObjectId(cartId)) {
                return res.status(400).send({ status: false, message: "Invalid cartId" });
            }
            if (!cartCreated) {
                return res.status(404).send({ status: false, message: "cart is not created" });
            }
            if (cartCreated._id != cartId) {
                return res.status(403).send({ status: false, message: "you can`t add product on other's cart" });
            }
        }

        if (!productId) {
            return res.status(400).send({ status: false, message: "productId is mandatory" })
        };
        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Invalid productId" });
        }
        let product = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            return res.status(404).send({ status: false, message: "product not found" });
        }

        if (quantity) {
            if (!isValidNum(quantity)) {
                return res.status(400).send({ status: false, message: "quantity must be in decimal Number" })
            };
        }else{
            quantity=1
        }
        
        if (cartCreated) {
            let cart = [...cartCreated.items];
            if (cart.length == 0) {
                cart.push({ productId, quantity });
            } else {
                for (let i = cart.length-1; i >=0 ; i--) {
                    if (cart[i].productId == productId) {
                        cart[i].quantity += quantity;
                        break;
                    } else if (i == 0) {
                        cart.push({ productId, quantity });
                    }
                }
            }

            let newPrice = cartCreated.totalPrice + product.price * quantity;
            let result = await cartModel.findByIdAndUpdate(cartCreated._id, { items: cart, totalPrice: newPrice, totalItems: cart.length }, { new: true });
            let data = await result.populate({ path: "items.productId", select: { price: 1, title: 1, productImage: 1, _id: 0 } })
            return res.status(200).send({ status: true, message: "Success", data: data });
        } else {
            let items = [{ productId, quantity }];
            let totalPrice = product.price * quantity;
            let result = await cartModel.create({ userId, items, totalPrice, totalItems: items.length });
            let data = await result.populate({ path: "items.productId", select: { price: 1, title: 1, productImage: 1, _id: 0 } })
            return res.status(201).send({ status: true, message: "Success", data: data });
        }
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};


const getCart = async (req, res) => {
    try {
        const userId = req.params.userId

        let findCart = await cartModel.findOne({ userId })
        if (!findCart) {
            return res.status(404).send({ status: false, message: "Cart not found" })
        }
        let data = await findCart.populate({ path: "items.productId", select: { price: 1, title: 1, productImage: 1, _id: 0 } })
        return res.status(200).send({ status: true, message: "Success", data: data });
    }
    catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
}


const deleteCartById = async function (req, res) {
    try {
        const userId = req.params.userId
        const deleteCartDetails = await cartModel.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0, totalItems: 0 } }, { new: true })
        if (!deleteCartDetails) {
            return res.status(404).send({ status: false, msg: "cart not found" })
        }

        return res.status(204).send({ status: true, massege: "Deleted Successfully", data: deleteCartDetails })

    } catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}


//--------------------------------cart update---------------------------------------------------
const updateCart = async function (req, res) {
    try {
        const userId = req.params.userId;
        const bodyData = req.body;

        // checking non empty body
        if (!isValidBody(bodyData)) {
            return res.status(400).send({ status: false, message: "please provide data in request body to update." });
        }
        // destructuring fields from body
        const { cartId, productId, removeProduct } = bodyData;

        // checking and validating fields
        if (!isEmpty(cartId)) {
            return res.status(400).send({ status: false, message: "cartId is required." });
        }
        if (!isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: "Invalid cartId" });
        }
        const cartData = await cartModel.findById(cartId);
        if (!cartData) {
            return res.status(404).send({ status: false, message: "cart not found" });
        }
        //validation for productId
        if (!isEmpty(productId)) {
            return res.status(400).send({ status: false, message: "productId is required.." });
        }
        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Invalid ProductId" });
        }
        const productData = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!productData) {
            return res.status(404).send({ status: false, msg: `product not found` });
        }

        if (!(removeProduct == 0 || removeProduct == 1)) {
            return res.status(400).send({ status: false, msg: `invalid removeProduct, it must be either 0 or 1` });
        }
        const cart = cartData.items;
        if (cart.length == 0) {
            return res.status(404).send({ status: false, msg: `product not found in cart` });
        }
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].productId == productId) {
                const priceChange = cart[i].quantity * productData.price;
                if (removeProduct == 0) {
                    const removeProduct = await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } }, totalPrice: cartData.totalPrice - priceChange, totalItems: cartData.totalItems - 1 }, { new: true });
                    let data = await removeProduct.populate({ path: "items.productId", select: { price: 1, title: 1, productImage: 1, _id: 0 } })
                    return res.status(200).send({ status: true, message: 'Success', data: data });
                }

                if (removeProduct == 1) {
                    if (cart[i].quantity == 1) {
                        const updatedPrice = await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } }, totalPrice: cartData.totalPrice - priceChange, totalItems: cartData.totalItems - 1 }, { new: true });
                        return res.status(200).send({ status: true, message: 'Success', data: updatedPrice });
                    }

                    cart[i].quantity = cart[i].quantity - 1;
                    const updatedCart = await cartModel.findByIdAndUpdate({ _id: cartId }, { items: cart, totalPrice: cartData.totalPrice - productData.price }, { new: true });
                    return res.status(200).send({ status: true, message: 'Success', data: updatedCart });
                }
            }else{
                return res.status(404).send({ status: false, message: "productId is not found in Cart" })
            }
        }
    } catch (error) {
        res.status(500).send({ msg: "Error", error: error.message });
    }
}



module.exports = { createCart, getCart, deleteCartById, updateCart }
