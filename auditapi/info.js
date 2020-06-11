const {RippleAPI} = require('ripple-lib');

function round(dight, howMany) {
	return howMany ? Math.round(dight * Math.pow(10, howMany)) / Math.pow(10, howMany) : Math.round(dight);
}

function dateStr(dt){
	return (dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate()+' '+dt.getHours()+':'+dt.getMinutes()+':'+dt.getSeconds()).replace(/([\-\: ])(\d{1})(?!\d)/g,'$10$2');
}

function getRemote(url) {
  var remote = new RippleAPI({
    server : url,
    feeCushion : 1.05,
    maxFeeXRP : "0.02"
  });
  remote.connection._config.connectionTimeout = 10000;
  remote.on('connected', () => {
    console.log('Connected to', url);
  });
  remote.on('disconnected', (code) => {
    console.log(url, 'disconnected, code:', code);
  });
  remote.on('error', (errorCode, errorMessage) => {
    console.warn(url, 'error(' + errorCode + '): ' + errorMessage);
  });
  return remote;
}

function connect(remote) {
	return remote.isConnected() ? Promise.resolve() : remote.connect();
}

var ripple = getRemote('wss://s1.ripple.com');
var xrpgen = getRemote('wss://g1.xrpgen.com');
var data = {
	accounts : {
		issuer : 'rpG9E7B3ocgaKqG7vmrsu3jmGwex8W4xAG',
		hotwallet : [
					'rKNDDQSHKztF4sU4kjs2YnjAMbXZ1cuzaS', 
					'rHwZV7VHYAd9QSa5P5mkcfniPdUEQHerxJ',
					'rNFdHpdz4hyUv1h337Aqh9pPftBkLDfAfB',
					'r39w4THcg9SyP7V9NH6N9auV5BuNjPCSPf'
				 ],
	},
	info : {
		issuer : {},
		balance : {},
		detail : {}
	},
	update_time : dateStr(new Date())
};

data.accounts.hotwallet.forEach(address => {
	data.info.detail[address] = {ripple : 0, xrpgen: 0};
});

async function checkIssuer() {
	await connect(ripple);
	let ret = await ripple.getTrustlines(data.accounts.issuer);
    let num = 0, total = 0;
    ret.forEach((line)=>{
      if (line.specification.currency == 'XAG') {
        num++;
        total += parseFloat(line.state.balance);
      }
    });

    let xag = await getBalance(xrpgen, data.accounts.issuer, 'XRP');
    return { holder_num: num, balance : round(total), reserve: round(xag)};
}

async function getBalance(remote, address, currency) {
	await connect(remote);
	try {
		let bal = await remote.getBalances(address);
		let xag = 0;
		bal.forEach(line => {
			if (line.currency == currency) {
				xag =  round(line.value, 2);
			}
		});
		return xag;
	} catch (err) {
		console.error(err);
		return 0;
	}
}

async function checkRipple() {
	let total = 0;
	for (let i=0; i<data.accounts.hotwallet.length; i++) {
		let address = data.accounts.hotwallet[i];
		let xag = await getBalance(ripple, address, 'XAG');
		data.info.detail[address].ripple = xag;
		total += xag;
	}
	data.info.balance.ripple = round(0 - data.info.issuer.balance - total);
}

async function checkXrpgen() {
	let total = 0;
	for (let i=0; i<data.accounts.hotwallet.length; i++) {
		let address = data.accounts.hotwallet[i];
		let xag = await getBalance(xrpgen, address, 'XRP');
		data.info.detail[address].xrpgen = xag;
		total += xag;
	}
	data.info.balance.xrpgen = total;
}

async function task() {
	try {
		data.info.issuer = await checkIssuer();
		await checkRipple();
		await checkXrpgen();
		data.info.balance.rate = round(data.info.balance.xrpgen / data.info.balance.ripple, 4);
		data.update_time = dateStr(new Date());
		console.log(data.info);
		setTimeout (task, 600 * 1000);
	} catch (err) {
		console.error(err);
	}
}

task();

exports.get = function() {
	return data;
}