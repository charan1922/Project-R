const { NseIndia } = require('stock-nse-india');

const nse = new NseIndia();

console.log("NseIndia methods:");
console.log(Object.getOwnPropertyNames(NseIndia.prototype));
