
function skipToEndOfBuffer(audio)
{
   let n = audio.buffered.length - 1;
   audio.muted = true;
   audio.currentTime = audio.buffered.end(n);
   audio.muted = false;
}
