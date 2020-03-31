const bcrypt = require('bcrypt')

const Company = require('../models/company.model')
const Users = require('../models/users.model')
const Order = require('../models/order.model')

const sendEmail = require('../../services/sendEmail')

const {
  types,
  status,
  messages,
  selectTypes
} = require('../../utils/constans')

// TODO: sarqel pagination-ov

exports.getAllCompanies = async (req, res) => {
  try {
    const admin = await Users.findOne({
      type: types.admin
    })

    if (req.userData.id !== `${admin._id}`) {
      return res.status(401).send({
        message: messages.errorMessage,
      })
    }
    const last = Number(req.query.last)
    const count = Number(req.query.count) + 1

    const companies = await Company.find({})
      .sort({
        createdTime: -1
      })
      .where('createdTime')
      .lt(last)
      .limit(count)
      .select(selectTypes.companyGetAll)

    if (companies.length === 0) {
      return res.status(206).send({
        message: messages.errorNoContent,
      })
    }

    const companiesOutput = []

    for (let i = 0; i < companies.length; i++) {
      // const orders_count = await Order.where({
      //   companyId: companies[i]._doc._id,
      //   type: types.pending,
      // }).count()
      // console.log(orders_count,"******");

      const company = {
        id: companies[i]._doc._id,
        ...companies[i]._doc,
        //orders_count,
      }
      companiesOutput.push(company)
    }

    return res.status(200).send(companiesOutput)
  } catch {
    return res.status(500).send({
      message: messages.errorMessage,
    })
  }
}

exports.getCompanyById = async (req, res) => {
  try {
    const _id = req.params.id

    if (req.userData.id !== _id) {
      return res.status(401).send({
        message: messages.errorMessage,
      })
    }

    const company = await Company.findOne({
      _id
    }).select(
      selectTypes.companyGetById
    )

    return res.status(200).send({
      id: company._doc._id,
      ...company._doc,
    })
  } catch (err) {
    return res.status(500).send({
      message: messages.errorMessage,
    })
  }
}

exports.createCompany = async (req, res) => {
  try {
    const user = await Users.findOne({
      email: req.body.email.toLowerCase()
    })
    const company = await Company.findOne({
      email: req.body.email.toLowerCase(),
    })

    if (!user && !company) {
      bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) {
          return res.status(500).send({
            message: messages.errorMessage,
          })
        }
        const company = new Company({
          ...req.body,
          email: req.body.email.toLowerCase(),
          password: hash,
        })

        company.save((err, company) => {
          if (err) {
            return res.status(400).send({
              message: messages.errorEmptyFields,
            })
          }
          sendEmail.sendInfoSignUp(company)
          sendEmail.sendWaitEmailForReceiver(company)
          return res.status(201).send({
            message: messages.successCompanyCreated,
          })
        })
      })
    } else {
      return res.status(406).send({
        message: messages.errorAlreadyExists,
      })
    }
  } catch {
    return res.status(500).send({
      message: messages.errorMessage
    })
  }
}

exports.delCompany = async (req, res) => {
  try {
    const _id = req.params.id
    const adminId = await Users.findOne({
      type: types.admin
    })
    const companyId = await Company.findOne({
      _id
    })

    if (
      !(
        req.userData.id === `${adminId._id}` ||
        req.userData.id === `${companyId._id}`
      )
    ) {
      return res.status(500).send({
        message: messages.errorMessage
      })
    }
    const order = await Order.findOne({
      companyId: _id
    })
    const pendingOrder = await Order.findOne({
      companyId: _id,
      state: status.pending,
    })
    if (pendingOrder) {
      return res.status(401).send({
        message: messages.errorCompanyCannotDel,
      })
    }

    if (order) {
      await Order.remove({
        companyId: _id
      })
    }

    await Company.findByIdAndRemove({
      _id
    })
    return res.status(202).send({
      message: messages.successCompanyDeleted,
    })
  } catch {
    return res.status(500).send({
      message: messages.errorMessage
    })
  }
}

exports.updateCompany = async (req, res) => {
  try {
    const _id = req.params.id
    const companyCheck = await Company.findOne({
      _id
    })
    const adminId = await Users.findOne({
      type: types.admin
    })

    if (Number(req.body.createdTime) !== Number(companyCheck.createdTime)) {
      return res.status(500).send({
        message: messages.errorMessage
      })
    }

    if (
      !(
        req.userData.id === `${adminId._id}` ||
        req.userData.id === `${companyCheck._id}`
      )
    ) {
      return res.status(500).send({
        message: messages.errorMessage
      })
    }
    if (
      req.body.approved === status.accepted &&
      companyCheck.approved !== status.accepted
    ) {
      sendEmail.sendAcceptEmail(companyCheck)
    } else if (
      req.body.approved === status.declined &&
      companyCheck.approved !== status.declined
    ) {
      sendEmail.sendDeclineEmail(companyCheck)
    }

    if (req.body.old_password && req.body.new_password) {
      bcrypt.compare(
        req.body.old_password,
        companyCheck.password,
        (err, result) => {
          console.log(err, result)
          if (err || !result) {
            return res.status(401).send({
              message: messages.errorOldPasswordMessage,
            })
          }

          bcrypt.hash(req.body.new_password, 10, (err, hash) => {
            if (err) {
              return res.status(500).send({
                message: messages.errorMessage,
              })
            }
            Company.findByIdAndUpdate(
              _id, {
                password: hash
              }, {
                new: true
              }
            ).then(_ => {
              return res.status(201).send({
                message: messages.successPasswordChanged,
              })
            })
          })
        }
      )
    } else {
      const company = await Company.findByIdAndUpdate(
        _id, {
          ...req.body,
        }, {
          new: true,
        }
      ).select(selectTypes.companyGetAll)
      return res.status(201).send({
        id: company._doc._id,
        ...company._doc,
      })
    }
  } catch {
    return res.status(500).send({
      message: messages.errorMessage,
    })
  }
}