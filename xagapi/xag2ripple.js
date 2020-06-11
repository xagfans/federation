
const {RippleAPI} = require('ripple-lib');
const rp = require('request-promise');

function responseJson(res, data) {
  res.writeHead(200, { 'Content-Type' : 'application/json; charset=UTF-8'});
  res.end(JSON.stringify(data));
};

function handleUser(request, res) {
	var result = {
		result : 'success',
		federation_json : {
			type : 'federation_record',
			destination : request.query['destination'],
			domain : 'xagfans.com',
			quote_url : 'https://xagfans.com/xagapi',
			currencies : [{
				currency : 'XAG'
			}],
			extra_fields : [{
				type : 'label',
				label : '从瑞波基因网络发送到瑞波地址。',
				hint : '瑞波钱包必须先授信XAG。有问题请发帖https://xagfans.com'
			},{
				type : 'text',
				name : 'rippleAddress',
				label : '瑞波地址',
				hint : 'Ripple Address',
				required : true
			}]
		},
		request : request.query
	}
	responseJson(res, result);
}

async function handleQuote(request, res) {
	var rippleAddress = (request.query['rippleAddress'] || "").trim();
	var amountStr = (request.query['amount'] || "").trim();
	
	if (!RippleAPI.isValidClassicAddress(rippleAddress)) {
		return handleAccountInvalid(request, res);
	}
			
	if (amountStr.length ==0 || amountStr.length > 100 || amountStr.indexOf("/") < 0) {
		return handleInvalid(request, res);
	}

	var amount = parseFloat(amountStr.substring(0, amountStr.indexOf("/")));
	if (amount < 20) {
		return handleTooSmall(request, res);
	}

	let trusted = await checkTrust(rippleAddress, amount);
	if (!trusted) {
		return handleTrustInvalid(request, res);
	}

	var memos = [{data: rippleAddress, type: 'ripple', format: 'text'}];
	
	var timestamp = Math.round(new Date().getTime()/1000);
	var result = {
		result : 'success',
		quote : {
			type : 'quote',
			destination : request.query['destination'],
			domain : 'xagfans.com',
			amount : request.query['amount'],
			source : request.query['address'],
			destination_address : 'rKNDDQSHKztF4sU4kjs2YnjAMbXZ1cuzaS',
			address : 'rKNDDQSHKztF4sU4kjs2YnjAMbXZ1cuzaS',
			memos : memos,
			send : [ {
				"value" : amount.toString(),
				"currency" : "XAG"
			} ],
			expires : timestamp + 7200
		},
		request : request.query,
		timestamp : timestamp
	}
	responseJson(res, result);
}

async function checkTrust(address, amount) {
	let cmd = {
	    "method": "account_lines",
	    "params": [
	        {
	            "account": address,
	            "ledger": "current"
	        }
	    ]
	};
	let options = {
		timeout: 	10000,
		url : 'https://s1.ripple.com:51234',
		method : 'POST',
		body : JSON.stringify(cmd)
	}
	try {
		let htmlString = await rp(options);
		let start = htmlString.indexOf("{");
		let end = htmlString.lastIndexOf("}");
		let data = JSON.parse(htmlString.substring(start, end+1));
		let limit = 0, bal = 0;
		for (let i=0; i<data.result.lines.length; i++){
			let line = data.result.lines[i];
			if (line.currency == 'XAG' && line.account == 'rpG9E7B3ocgaKqG7vmrsu3jmGwex8W4xAG') {
				limit = parseFloat(line.limit);
				bal = parseFloat(line.balance);
			}
		}
		console.log(address, 'trust', limit);
		return limit - bal - amount > 0;		
	} catch (err) {
		console.error(err);
		return false;
	}
}

function handleAccountInvalid(request, res) {
	var error = {
		result : 'error',
		error_message : 'Invalid Account. 地址无效。',
		request : request.query
	}
	responseJson(res, error);
}

function handleTrustInvalid(request, res) {
	var error = {
		result : 'error',
		error_message : '没有授信XAG。 Insufficient trust.',
		request : request.query
	}
	responseJson(res, error);
}

function handleInvalid(request, res) {
	var error = {
		result : 'error',
		error_message : 'Invalid. 其他错误。',
		request : request.query
	}
	responseJson(res, error);
}

function handleTooSmall(request, res) {
	var error = {
		result : 'error',
		error_message : '至少发送20 XAG。 Send at least 20 XAG.',
		request : request.query
	}
	responseJson(res, error);
}

exports.handleUser = handleUser;
exports.handleQuote = handleQuote;