'use strict';

const Analysis = require('tago/analysis');
const Device   = require('tago/device');
const Utils    = require('tago/utils');
const Account  = require('tago/account');
const co       = require('co');

function convert_hex2dec(num) {
  return parseInt((num), 16).toString(10);
}

function special_convert_hex2bin(num) {
  let bin = String(parseInt(num, 16).toString(2));
  if (bin.length < 8) {
    const addzero = 8 - bin.length;
    for (let index = 0; index < addzero; index++) {
      bin = `0${bin}`;
    }
  }
  return bin;
}

function extract_number_2Bytes_inverted(message, low, high) {
  const hex = `${message[high]}${message[low]}`; // first high - second low. inverted byte
  return convert_hex2dec(hex);
}

function special_extract_number_1Byte(message, low) {
  const hex = `${message[low]}`;
  return special_convert_hex2bin(hex);
}

function extract_number_1Byte(message, low) {
  const hex = `${message[low]}`;
  return convert_hex2dec(hex);
}

function parse(context, scope) {
  co(function* _() {
    const env_var = Utils.env_to_obj(context.environment);
    if (!env_var.account_token) return context.log('Can not be found the parameter account_token on environment variables');
    context.log('Parse started!');
    const data = !scope[0] ? null : scope.find(x => x.variable === 'data');
    if (!data) return context.log('Variable data can not be found');

    const data_to_tago = [];
    const serie = data.serie || Date.now();
    const time = data.time || undefined;
    const payload = String(data.value);
    const bytes = [];

    for (let i = 0; i < payload.length; i += 2) {
      bytes.push(`${payload[i]}${payload[i + 1]}`);
    }

    const byte1 = special_extract_number_1Byte(bytes, 0);
    let sequence;
    let mode_operation;
    let event;

    if (String(byte1).length === 8) {
      sequence       = String(byte1).slice(0, 3);
      mode_operation = String(byte1).slice(3, 5);
      event          = String(byte1).slice(5, 8);
    }

    const battery     = extract_number_1Byte(bytes, 1) / 10;
    const temperature = extract_number_1Byte(bytes, 2);
    const humidity    = extract_number_1Byte(bytes, 3);


    if (bytes.length === 6) {
      const pulse = extract_number_2Bytes_inverted(bytes, 4, 5);
      data_to_tago.push({ variable: 'pulse_count', value: Number(pulse), serie, time, unit: 'Pulses' });
    } else {
      const external_status = extract_number_1Byte(bytes, 4);
      data_to_tago.push({ variable: 'external_status', value: Number(external_status), serie, time });
    }

    const myaccount = new Account(env_var.account_token);
    const device_token = yield Utils.getTokenByName(myaccount, data.origin, ['Generic', 'Default', 'Token #1', 'Token #2']);
    if (!device_token) return context.log(`Can not be found token to device origin: ${data.origin}`);

    data_to_tago.push({
      variable: 'mode_operation',
      value: Number(mode_operation), // === 0 ? 'Modo de Contador de Pulsos' : 'Modo de Evento Externo',
      metadata: { mode_operation: Number(mode_operation) },
      serie,
      time,
    }, {
      variable: 'event',
      value: Number(event), // === 0 ? 'Evento de temporizador periódico' :  Number(event) === 1 ? 'Botão Pressionado' : 'Ocorrêcia Externa',
      metadata: { sequence: Number(sequence), event: Number(event) },
      serie,
      time,
    }, {
      variable: 'battery',
      value: Number(battery),
      unit: 'V',
      serie,
      time,
    }, {
      variable: 'temperature',
      value: Number(temperature),
      unit: '°C',
      serie,
      time,
    }, {
      variable: 'humidity',
      value: Number(humidity),
      unit: '%',
      serie,
      time,
    });

    const mydevice = new Device(device_token);
    const find_by_serie = yield mydevice.find({ serie, qty: 99 });

    find_by_serie.forEach((element) => {
      if (element.value === 'null') {
        mydevice.remove(element.id).then(context.log('Removed variable with null value')).catch(context.log);
      }
    });

    yield mydevice.insert(data_to_tago).then(context.log);
    context.log('Parse successfully finished!');
  }).catch(context.log);
}

module.exports = new Analysis(parse, 'analysis-token');
