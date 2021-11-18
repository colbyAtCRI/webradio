// monitors the peak RF power levels within the modem
// band. If the power peak drops by more than threshold,
// the callback is called.
function PeakPowerMonitor()
{
   this.lastPower = 0;
   this.threshold = 5;
   this.onLevelChange;
   this.onPower;
}

PeakPowerMonitor.prototype.process = function(data)
{
   let peak = -4000;
   let fl = data.tuner.freq - data.modem.bandwidth/2;
   let fu = data.tuner.freq + data.modem.bandwidth/2;
   let f  = data.spectrum.fstart;
   for (let n = 0; n < data.spectrum.data.length; n++) {
      if ( f >= fl && f <= fu )
         peak = Math.max(peak,data.spectrum.data[n]);
      f += data.spectrum.fstep;
   }
   this.onPower(peak);
   if ( this.onLevelChange && Math.abs((this.lastPower - peak)) > this.threshold )
      this.onLevelChange();
   this.lastPower = peak;
}

