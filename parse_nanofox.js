const TagoAnalysis = require('tago/analysis');
const TagoDevice = require('tago/device');
const TagoUtils = require('tago/utils');
const TagoAccount = require('tago/account');

async function parse(context, scope) {
  context.log('Running');
  if (!scope[0]) return context.log('no scope');
  const environment = TagoUtils.env_to_obj(context.environment);
  if (!environment.account_token) return context.log('Missing account_token environment var');

  const temperature_n = scope.find(x => x.variable === 'temperature_n');
  const humidity = scope.find(x => x.variable === 'humidity');
  const rs_r0 = scope.find(x => x.variable === 'rs_r0');
  const alarm_state = scope.find(x => x.variable === 'alarm_state');
  if (!temperature_n || !humidity || !rs_r0 || !alarm_state) return context.log('device variables does not exists');

  const account = new TagoAccount(environment.account_token);
  const token = await TagoUtils.getTokenByName(account, temperature_n.origin, ['Default', 'Generic', 'Token #1', 'Token #2']);
  const device = new TagoDevice(token);

  const time = temperature_n.time ? temperature_n.time : new Date().toISOString();
  const serie = temperature_n.serie ? temperature_n.serie : new Date().getTime();

  const temp_value = Number(Number(temperature_n.value) / 100).toFixed(2);
  const humidity_value = Number(Number(humidity.value) / 100).toFixed(2);
  const rs_value = Number(Number(rs_r0.value) / 1000).toFixed(2);

  const datatotago = [{
    variable: 'temperature_parsed',
    value: Number(temp_value),
    time,
    serie,
    unit: '°C',
  }, {
    variable: 'humidity_parsed',
    value: Number(humidity_value),
    time,
    serie,
    unit: '%',
  }, {
    variable: 'rs_r0_parsed',
    value: Number(rs_value),
    time,
    serie,
  }];

  switch (String(alarm_state.value)) {
    case '1':
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Temperatura', serie, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Temperatura', serie, time, metadata: { color: 'pink' } });
      break;
    case '2':
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Umidade', serie, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Umidade', serie, time, metadata: { color: 'pink' } });
      break;
    case '3':
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Temperatura', serie: Number(serie) + 1, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Umidade', serie, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Temperatura', serie: Number(serie) + 1, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Umidade', serie, time, metadata: { color: 'pink' } });
      break;
    case '4':
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Gas', serie, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Gas', serie, time, metadata: { color: 'pink' } });
      break;
    case '5':
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Gas', serie: Number(serie) + 1, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Temperatura', serie, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Gas', serie: Number(serie) + 1, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Temperatura', serie, time, metadata: { color: 'pink' } });
      break;
    case '6':
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Umidade', serie: Number(serie) + 1, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Gas', serie, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Umidade', serie: Number(serie) + 1, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Gas', serie, time, metadata: { color: 'pink' } });
      break;
    case '7':
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Temperatura', serie: Number(serie) + 1, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Umidade', serie: Number(serie) + 2, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed', value: 'Alarme de Gas', serie, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Temperatura', serie: Number(serie) + 1, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Umidade', serie: Number(serie) + 2, time, metadata: { color: 'pink' } });
      datatotago.push({ variable: 'alarm_parsed_error', value: 'Alarme de Gas', serie, time, metadata: { color: 'pink' } });
      break;
    default:
      datatotago.push({ variable: 'alarm_parsed', value: 'Normal', serie, time, metadata: { color: 'lightgreen' } });
      break;
  }

  await device.insert(datatotago).then(context.log).catch(context.log);
  context.log('parse has been finished!');
}

module.exports = new TagoAnalysis(parse, '9b22e530-9216-11e6-b97b-6f4c87e82ec2');
