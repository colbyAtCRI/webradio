require("svg.js");

// make a table 
window.tunerTable = function(cfg)
{
  var ret = '<table> <th>Parameter</th><th>Value</th>';
  for (key in cfg['tuner']) {
    ret += '<tr><td>'+key+'</td>'+'<td>'+cfg['tuner'][key]+'</td></tr>';
  }
  ret += '</table>';
  return ret;
};
