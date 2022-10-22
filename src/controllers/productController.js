const productModel = require('../models/productModel');
const aws = require("../utils/aws")
const { isEmpty, isValidPrice,isValidBody, isValidSize, isValidObjectId,isValidName } = require('../utils/validation')

const createProduct = async function (req, res) {
    try {
        let { title, description, price, currencyId, currencyFormat, style, isFreeShipping, availableSizes, installments, isDeleted } = req.body;

        //validation for emptyBody
        if (!isValidBody(req.body)) {
            return res.status(400).send({ status: false, message: "Please Enter Some Input" });
        };
        if (!title) {
            return res.status(400).send({ status: false, message: "Title Mandatory" })
        }
        if (!isValidName(title)) {
            return res.status(400).send({ status: false, message: "Title is String only" })
        }
        let uniqueTitle = await productModel.findOne({ title })
        if (uniqueTitle) {
            return res.status(409).send({ status: false, message: "Given title is already taken" })
        }
        if (!description) {
            return res.status(400).send({ status: false, message: "description is mandatory" })
        }
        if (!isEmpty(description)) {
            return res.status(400).send({ status: false, message: "description is String only" })
        };
        if (!price) {
            return res.status(400).send({ status: false, message: "Price is mandatory" })
        };
        if (!isValidPrice(price)) {
            return res.status(400).send({ status: false, message: "Price must be in decimal Number" })
        };
        //validation for currencyId and currencyFormat
        if (currencyId) {
            if (currencyId !== "INR") {
                return res.status(400).send({ status: false, message: "CurrencyId is always INR/String only" })
            };
        } else {
            req.body.currencyId = "INR"
        }
        if (currencyFormat) {
            if (currencyFormat !== "₹") {
                return res.status(400).send({ status: false, message: "currencyFormat is always INR/String only" })
            };
        } else {
            req.body.currencyFormat = "₹"
        }


        if (isFreeShipping) {
            if (typeof isFreeShipping !== "boolean") {
                return res.status(400).send({ status: false, message: "isFreeShipping Boolean only" })
            };
        }
        if (style) {
            if (!isEmpty(style)) {
                return res.status(400).send({ status: false, message: "Style String only" })
            };
        }

        if (!availableSizes) {
            return res.status(400).send({ status: false, msga: "give atleast one availableSizes" })
        };
        let size = availableSizes.toUpperCase().split(",").map((item) => item.trim()) //creating an array
        req.body.availableSizes = size;

        for (let i = 0; i < size.length; i++) {
            if (!isValidSize(size[i])) {
                return res.status(400).send({ status: false, message: "Size should be one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'" })
            }
        }
        if (installments) {
            if (!isValidPrice(price)) {
                return res.status(400).send({ status: false, message: "installments must be in decimal Number" })
            };
        }
        //validation for productImage and creating AWS link
        let file = req.files;
        if (file && file.length > 0) {
            const url = await aws.uploadFile(file[0]);
            req.body.productImage = url
        } else {
            return res.status(400).send({ status: false, message: "ProductImage Is Mandatory" });
        }

        let dataCreted = await productModel.create(req.body)
        return res.status(201).send({ status: true, message: "Success", data: dataCreted });

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

const getProductById = async (req, res) => {
    try {
        let productId = req.params.productId;

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Invalid ProductId" });
        }

        let result = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!result) {
            return res.status(404).send({ status: false, message: "products not found" });
        }

        return res.status(200).send({ status: true, message: "Success", data: result });
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};


const getProduct = async (req, res) => {
    try {
        let { size, name, priceGreaterThan, priceLessThan, priceSort } = req.query;
        let filterQueryData = { isDeleted: false }
        if (size) {
            let sizes = size.toUpperCase().split(",").map((item) => item.trim()) //creating an array
            filterQueryData['availableSizes'] = sizes
            for (let i = 0; i < sizes.length; i++) {
                if (!isValidSize(sizes[i])) {
                    return res.status(400).send({ status: false, message: "Size should be one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'" })
                }
            }
        }
        if (name) {
            if (!isValidName(name)) {
                return res.status(400).send({ status: false, message: "Name is String only" })
            }
            filterQueryData['title'] = name.trim();
        }
        // all type of price filter
        if (priceGreaterThan && priceLessThan) {
            if ((!isValidPrice(priceGreaterThan)) || (!isValidPrice(priceLessThan))) {
                return res.status(400).send({ status: false, message: 'please provide priceGreaterThan && priceLessThan as number' });
            }
            filterQueryData['price'] = { $gt: priceGreaterThan, $lt: priceLessThan };
        } else if (priceGreaterThan) {
            if (!isValidPrice(priceGreaterThan)) {
                return res.status(400).send({ status: false, message: 'please provide priceGreaterThan as number' });
            }
            filterQueryData['price'] = { $gt: priceGreaterThan };
        } else if (priceLessThan) {
            if (!isValidPrice(priceLessThan)) {
                return res.status(400).send({ status: false, message: 'please provide priceLessThan as number' });
            }
            filterQueryData['price'] = { $lt: priceLessThan };
        }
        //ascending descending filtter
        if (priceSort) {
            if (priceSort == 1) {
                const finalData = await productModel.find(filterQueryData).sort({ price: 1 })
                if (finalData.length == 0) return res.status(404).send({ status: false, message: 'no product found' });
                return res.status(200).send({ status: true, message: 'Success', data: finalData });

            } else if (priceSort == -1) {
                const finalData = await productModel.find(filterQueryData).sort({ price: -1 })
                if (finalData.length == 0) return res.status(404).send({ status: false, message: 'no product found' });
                return res.status(200).send({ status: true, message: 'Success', data: finalData });
            }
        }
        const finalData = await productModel.find(filterQueryData)
        if (finalData.length == 0) return res.status(404).send({ status: false, message: 'no product found' });
        return res.status(200).send({ status: true, message: 'Success', data: finalData });
    } catch (error) {
        res.status(500).send({ status: false, error: error.message })
    }
}




const updateProduct = async function (req, res) {
    try {

        let productId = req.params.productId
        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Invalid ProductId" });
        }

        let { title, description, price, currencyId, currencyFormat, style, isFreeShipping, availableSizes, productImage, installments, isDeleted } = req.body;

        //validation for emptyBody
        if (!isValidBody(req.body)) {
            return res.status(400).send({ status: false, message: "Please Enter Some Input" });
        };
        if (title) {
            if (!isEmpty(title)) {
                return res.status(400).send({ status: false, message: "Title is String only" })
            }
            let uniqueTitle = await productModel.findOne({ title })
            if (uniqueTitle) {
                return res.status(409).send({ status: false, message: "Given title is already taken" })
            }
        }

        if (description) {
            if (!isEmpty(description)) {
                return res.status(400).send({ status: false, message: "description is String only" })
            };
        }
        if (price) {

            if (!isValidPrice(price)) {
                return res.status(400).send({ status: false, message: "Price must be in decimal Number" })
            };
        }
        //validation for currencyId and currencyFormat
        if (currencyId) {
            if (currencyId !== "INR") {
                return res.status(400).send({ status: false, message: "CurrencyId is always INR/String only" })
            };
        }
        if (currencyFormat) {
            if (currencyFormat !== "₹") {
                return res.status(400).send({ status: false, message: "currencyFormat is always INR/String only" })
            };
        }
        if (isFreeShipping) {
            if (isFreeShipping != "true" && isFreeShipping != "false") {
                return res.status(400).send({ status: false, message: "isFreeShipping Boolean only" })
            };
        }
        if (availableSizes) {
            let size = availableSizes.toUpperCase().split(",").map((item) => item.trim()) //creating an array
            req.body.availableSizes = size;
            for (let i = 0; i < size.length; i++) {
                if (!isValidSize(size[i])) {
                    return res.status(400).send({ status: false, message: "Size should be one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'" })
                }
            }
        }
        if (currencyId) {
            if (currencyId != "INR") {
                return res.status(400).send({ status: false, message: "CurrencyId should only be INR " })
            }
        }
        if (currencyFormat) {
            if (currencyFormat != "₹") {
                return res.status(400).send({ status: false, message: "currencyFormat should only be ₹" })
            }
        }
        if (isFreeShipping) {
            if (!(isFreeShipping == "true" || isFreeShipping == "false")) {
                return res.status(400).send({ status: false, message: " isFreeShipping only be true or false" })
            }
        }
        if (style) {
            if (!isEmpty(style)) {
                return res.status(400).send({ status: false, message: "style String only" })
            };
        }
        if (installments) {
            if (!isValidPrice(installments)) {
                return res.status(400).send({ status: false, message: "please enter installments in decimal Number" })
            }
        }

        let file = req.files;
        if (file && file.length > 0) {
            let url = await aws.uploadFile(file[0]);
            req.body.productImage = url
        }

        if (isDeleted) {
            if (typeof isDeleted !== "boolean" || isDeleted == true) {
                return res.status(400).send({ status: false, message: "isDeleted Boolean only/you cant delete when product is not created" })
            };
        }

        let updatedProduct = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { $set: req.body }, { new: true })
        if (!updatedProduct) {
            return res.status(400).send({ status: false, message: "products not found" })
        }

        return res.status(200).send({ status: true, message: "updated", data: updatedProduct })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


const deleteProduct = async (req, res) => {
    try {
        let productId = req.params.productId;

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Invalid productId" });
        }

        let product = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { isDeleted: true, deletedAt: new Date() }, { new: true });
        if (!product) {
            return res.status(404).send({ status: false, message: "Product not found" });
        }
        return res.status(200).send({ status: true, message: "The product is deleted successfully", data: product });

    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
}

module.exports = { createProduct,getProduct, getProductById,  updateProduct,deleteProduct }
