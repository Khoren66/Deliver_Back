const {
  socketListeners,
  socketEmiters,
  messages,
} = require('../utils/constans')

const User = require('../api/models/users.model')
const Company = require('../api/models/company.model')
const Order = require('../api/models/order.model')
// TODO: socetnerin kpcnel token-i stugum@
exports.socketListeners = socket => {
  socket.on(socketListeners.newAccount, async accountData => {
    console.log('hello', accountData)
    const user = await User.findOne({
      email: accountData.data.email,
    })
    const company = await Company.findOne({
      email: accountData.data.email,
    })
    if (user) {
      socket.broadcast.emit(socketEmiters.updateUserList, {
        id: user._id,
        name: user.name,
        lastName: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        type: user.type,
        approved: user.approved,
        passportURL: user.passportURL,
        avatar: user.avatar,
        amount: user.amout,
        rating: user.rating,
        createdTime: user.createdTime,
      })
    } else if (company) {
      socket.broadcast.emit(socketEmiters.updateCompanyList, {
        id: company._id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        taxNumber: company.taxNumber,
        address: company.address,
        approved: company.approved,
        activity: company.activity,
        avatar: company.avatar,
        amount: company.amount,
        createdTime: company.createdTime,
      })
    } else {
      return res.status(500).send({
        message: messages.errorMessage,
      })
    }
  })
  socket.on(socketListeners.deleteUser, () => {
    socket.broadcast.emit(socketEmiters.deletedUser, {
      data: 'User has been deleted, please refresh',
    })
  })
  socket.on(socketListeners.deleteCompany, () => {
    socket.broadcast.emit(socketEmiters.deletedCompany, {
      data: 'Company has been deleted, please refresh',
    })
  })
  socket.on(socketListeners.newOrder, orderData => {
    Order.findOne({
        companyId: orderData.data.companyId,
      })
      .then(data => {
        socket.broadcast.emit(socketEmiters.updateOrderList, data)
      })
      .catch(err => {
        return res.status(500).send({
          message: messages.errorMessage,
          err,
        })
      })
  })
  socket.on(socketListeners.deleteOrder, () => {
    socket.broadcast.emit(socketEmiters.deletedOrder, {
      data: 'Order has been deleted, please refresh',
    })
  })
  socket.on(socketListeners.userTakeOrder, (user) => {
    socket.broadcast.emit(socketEmiters.userTookOrder, {
      data: `${user.userId} took your order`
    })
  })
}