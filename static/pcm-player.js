function PCMPlayer() {
    this.init();
}

PCMPlayer.prototype.init = function() {
    this.gain = 1.0;
    this.createContext();
};

PCMPlayer.prototype.setGaindB = function(gain)
{
   this.gain = Math.pow(10,gain/10);
}

PCMPlayer.prototype.createContext = function() {
   this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
   this.audio_sr = this.audioCtx.sampleRate;
   // context needs to be resumed on iOS and Safari (or it will stay in "suspended" state)
   this.audioCtx.resume();
   // if you want to see "Running" state in console and be happy about it
   this.audioCtx.onstatechange = () => console.log(this.audioCtx.state);
   this.gainNode = this.audioCtx.createGain();
   this.gainNode.gain.value = 1;
   this.gainNode.connect(this.audioCtx.destination);
   this.startTime = undefined;
};

PCMPlayer.prototype.volume = function(volume) {
    this.gainNode.gain.value = volume;
};

PCMPlayer.prototype.destroy = function() {
    this.audioCtx.close();
    this.audioCtx = null;
};

PCMPlayer.prototype.reset = function()
{
   this.startTime = undefined;
}

PCMPlayer.prototype.play  = function(data)
{
   var bufferSource = this.audioCtx.createBufferSource();
   var length = data.modem.pcm.length / data.modem.channels;
   var audioBuffer  = this.audioCtx.createBuffer(data.modem.channels, length, data.modem.out_sr);
   var audioData, channel, offset, n;

   // Transfer samples one at a time.
   for (channel = 0; channel < data.modem.channels; channel++) {
      audioData = audioBuffer.getChannelData(channel);
      offset = channel;
      for (n = 0; n < length; n++) {
         audioData[n] = data.modem.pcm[offset];
         offset += data.modem.channels;
      }
   }
   bufferSource.buffer = audioBuffer;
   bufferSource.connect(this.gainNode);
   // When will then be now?
   if (!this.startTime || this.audioCtx.currentTime > this.startTime) {
      this.startTime = this.audioCtx.currentTime;
      console.log('new start time');
   }
   bufferSource.start(this.startTime);
   this.startTime += audioBuffer.duration;
}

