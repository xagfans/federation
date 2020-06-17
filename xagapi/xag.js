
const {RippleAPI} = require('ripple-lib');

function responseJson(res, data) {
  res.writeHead(200, { 'Content-Type' : 'application/json; charset=UTF-8'});
  res.end(JSON.stringify(data));
};

function validatePositiveNumber(str) {
	var re = /^[1-9][0-9]*$/;
	return re.test(str);
}

function handleUser(request, res) {
	var result = {
		result : 'success',
		federation_json : {
			type : 'federation_record',
			destination : request.query['destination'],
			domain : 'xagfans.com',
			quote_url : 'https://xagfans.com/xagapi',
			currencies : [{
				currency : 'XAG',
				issuer : 'rpG9E7B3ocgaKqG7vmrsu3jmGwex8W4xAG'
			}],
			extra_fields : [{
				type : 'label',
				label : '从瑞波网络发送到瑞波基因地址。',
				hint : '请使用瑞波钱包2.3版本或更高。有问题请发帖https://xagfans.com'
			},{
				type : 'text',
				name : 'xagAddress',
				label : '瑞波基因地址',
				hint : 'Xrpgen Address',
				required : true
			},{
				type : 'text',
				name : 'xagTag',
				label : '标签 (纯数字，选填。发送到交易所必填。)',
				hint : 'Tag (Optional, fill it when you send to other exchanges)',
				required : false
			}]
		},
		request : request.query
	}
	responseJson(res, result);
}

function handleQuote(request, res) {
	var xagAddress = (request.query['xagAddress'] || "").trim();
	var xagTag = (request.query['xagTag'] || "").trim();
	var amountStr = (request.query['amount'] || "").trim();
	
	if (!RippleAPI.isValidClassicAddress(xagAddress)) {
		return handleAccountInvalid(request, res);
	}

	var exchanges = ['rpFQmjCQzeGFXmxTtFAczofEyF21oBifHb', 'rncbeDb1EiAjiomcM5a29AqKXpMcKTqvYR'];
	if (exchanges.indexOf(xagAddress) >= 0 && !xagTag) {
		return handleExchangeId(request, res);
	}
			
	if (xagTag && !validatePositiveNumber(xagTag)) {
		return handleTagInvalid(request, res);
	}
	if (amountStr.length ==0 || amountStr.length > 100 || amountStr.indexOf("/") < 0) {
		return handleInvalid(request, res);
	}

	var amount = parseFloat(amountStr.substring(0, amountStr.indexOf("/")));
	if (amount < 50) {
		return handleTooSmall(request, res);
	}
	var xag = calculate(amount);

	var memos = [{data: xagAddress, type: 'xrpgen', format: 'text'}];
	if (xagTag) {
		memos.push({data: xagTag, type: 'tag', format: 'text'});
	}
	
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
				"value" : xag.toString(),
				"issuer" : "rKNDDQSHKztF4sU4kjs2YnjAMbXZ1cuzaS",
				"currency" : "XAG"
			} ],
			expires : timestamp + 7200
		},
		request : request.query,
		timestamp : timestamp
	}
	responseJson(res, result);
}

function calculate(amount) {
	var min_fee = 1;
	var fee = amount * 0.006;
	if (fee < min_fee) {
		fee = min_fee;
	}
	return amount + fee;
}

function handleAccountInvalid(request, res) {
	var error = {
		result : 'error',
		error_message : 'Invalid Account. 地址无效。',
		request : request.query
	}
	responseJson(res, error);
}

function handleTagInvalid(request, res) {
	var error = {
		result : 'error',
		error_message : 'Invalid Tag. 标签无效。',
		request : request.query
	}
	responseJson(res, error);
}

function handleExchangeId(request, res) {
	var error = {
		result : 'error',
		error_message : 'Tag required. 必须提供标签。',
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
		error_message : '至少发送50 XAG。 Send at least 50 XAG.',
		request : request.query
	}
	responseJson(res, error);
}

exports.handleUser = handleUser;
exports.handleQuote = handleQuote;