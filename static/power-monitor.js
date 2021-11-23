// monitors the peak RF power levels within the modem
// band. If the power peak drops by more than threshold,
// the callback is called.

function dBtoPower(dB)
{
    return Math.pow(10,dB/10);
}

// meter_id is the id of a meter tag
// Okay, meter tags suck. Would like a more analog radio 
// look and feel.
function PeakPowerMonitor(meter_id,id_smeter)
{
    this.meter = new PowerMeter(meter_id,id_smeter);
    this.smeter = new SMeter(id_smeter);
    this.rockBottom = -4000; // this is a lot in dB
    this.peak = [];
    this.average = [];
    this.threshold = 5;
    this.onLevelChange = function(){};
    this.onPower = function(){};
    for (let n = 0; n < 10; n++) {
        this.peak.push(this.rockBottom);
        this.average.push(0);
    }
}

PeakPowerMonitor.prototype.variation = function()
{
    let minval = this.rockBottom;
    let maxval = this.rockBottom;
    for (let n = 0; n < this.peak.length; n++) {
        minval = Math.min(minval,this.peak[n]);
        maxval = Math.max(maxval,this.peak[n]);
    }
    if (!(minval === this.rockBottom))
        return maxval - minval;
    else
        return 0;
}

PeakPowerMonitor.prototype.process = function(data)
{
    let fl = data.radio.tunerFreq + data.modem.fstart;
    let fu = data.radio.tunerFreq + data.modem.fend;
    let f  = data.spectrum.fstart;
    let N = 0;
    this.peak.shift(); // drop oldest value
    this.peak.push(this.rockBottom);
    this.average.shift();
    this.average.push(0);
    for (let n = 0; n < data.spectrum.data.length; n++) {
        if ( f >= fl && f <= fu ) {
            this.peak[9] = Math.max(this.peak[9],data.spectrum.data[n]);
            this.average[9] += data.spectrum.data[n];
            N += 1;
        } 
        f += data.spectrum.fstep;
    }
    this.average[9] /= N; 
    this.meter.draw(this.peak[9]);
    this.smeter.draw(this.peak[9] - this.average[9]);
    this.onPower(this.power,this.average);
    if ( this.variation() > this.threshold )
        this.onLevelChange();
}

