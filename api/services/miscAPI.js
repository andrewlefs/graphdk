var URI = require('urijs');
var axios = require('axios');
var MISC_URL = 'http://misc.addgold.net/app/v1.0';

module.exports = {
    init: function (params) {
        return new Promise((resolve, reject) => {
            var link = MISC_URL + `/init/?` + URI.buildQuery(params);
		console.log(link);
            makeRequest(link).then(response => {
		console.log('rp', response);
		console.log('bb');
                resolve(response);
            }, error => {
                reject(error);
            });
        });
    },
    paymentList: function (params) {
        return new Promise((resolve, reject) => {
            var link = MISC_URL + `/paymentlist/?` + URI.buildQuery(params);
            console.log(link)
            makeRequest(link).then(response => {
                resolve(response);
            }, error => {
                reject(error);
            });
        });
    }
}

function makeRequest(link) {
    return new Promise((resolve, reject) => {
        axios.get(link).then(response => {
            resolve(response.data);
        }, error => {
            reject(error);
        });
    });
}
