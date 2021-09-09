const formatSeconds = ( val ) => {
  let sec = parseInt( val );
  let min = 0;
  let hour = 0;
  let result = "";
  if( val > 60 ) {
    sec = parseInt( val % 60 );
    min = parseInt( val / 60 );

    if( min > 60 ) {
      min = parseInt( min % 60);
      hour = parseInt( min / 60);
    }
  }
  if( hour > 0) result += `${hour} : `
  if(min > 0) result += `${min} : `
  result += `${sec}`;
  return result;
}