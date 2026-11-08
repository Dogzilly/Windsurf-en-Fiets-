export function validWindStatus(station,now=Date.now()) {
 if(!station || !Number.isFinite(station.wind_ms) || station.wind_ms<0 || !Number.isFinite(station.km) || station.km>40) return false;
 const age=now-Date.parse(station.wind_ts);
 return Number.isFinite(age) && age>=0 && age<=3*3600e3;
}
