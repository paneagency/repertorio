
/**
 * Formats seconds into a HH:MM:SS or MM:SS string
 * @param {number} totalSeconds 
 * @returns {string} e.g. "03:05" or "01:10:30"
 */
export const secondsToTime = (totalSeconds) => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
  
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');

  if (h > 0) {
    const hStr = h.toString().padStart(2, '0');
    return `${hStr}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
};

/**
 * Parses a time string or raw number input into seconds.
 * Supports:
 * - "mm:ss" ("03:30")
 * - "hh:mm:ss" ("01:05:20")
 * - Raw digits "305" -> "03:05" -> 185 seconds
 * - Raw digits "112" -> "01:12" -> 72 seconds
 * 
 * @param {string} input 
 * @returns {number} Seconds, or 0 if invalid
 */
export const timeToSeconds = (input) => {
  if (!input) return 0;
  
  // Remove non-digit/colon characters
  const cleanInput = input.trim().replace(/[^0-9:]/g, '');

  // Case 1: Already has colons
  if (cleanInput.includes(':')) {
    const parts = cleanInput.split(':').map(Number);
    if (parts.some(isNaN)) return 0;

    let seconds = 0;
    if (parts.length === 3) { // hh:mm:ss
      seconds += parts[0] * 3600;
      seconds += parts[1] * 60;
      seconds += parts[2];
    } else if (parts.length === 2) { // mm:ss
      seconds += parts[0] * 60;
      seconds += parts[1];
    }
    return seconds;
  }

  // Case 2: Only numbers (Smart formatting)
  // "305" -> 3 min 5 sec
  // "112" -> 1 min 12 sec
  // "60" -> 0 min 60 sec (technically 1 min)
  // Logic: treat last 2 digits as seconds, rest as minutes, unless <= 2 digits total
  
  const num = parseInt(cleanInput, 10);
  if (isNaN(num)) return 0;
  
  if (cleanInput.length <= 2) {
    // Treat as seconds if it's small? No, user prompt says "305" -> 03:05.
    // If I type "45", is it 00:45 or 45:00?
    // Prompts says: "112" -> "01:12". 
    // It implies separating minutes and seconds.
    // Let's assume standard behavior:
    // 1-2 digits: seconds provided? 
    // Actually typically context: "305" => 3:05.
    // "90" => 0:90 -> 1:30? Or 09:0?
    // Let's follow the pattern: Last 2 digits are ALWAYS seconds.
    // But if length is <= 2? e.g. "45". usually means 45 seconds.
    // "120" -> 1:20? 
    
    // Spec examples: 
    // 305 -> 03:05
    // 112 -> 01:12
    
    // Implementation:
    const s = num % 100;
    const m = Math.floor(num / 100);
    return (m * 60) + s;
  }
  
  // Length > 2, treat last 2 as seconds
  const s = num % 100;
  const m = Math.floor(num / 100);
  return (m * 60) + s;
};

/**
 * Formats input into a standardized string (mm:ss or hh:mm:ss)
 * Used for "on blur" auto-formatting
 * @param {string} input 
 * @returns {string}
 */
export const formatDurationInput = (input) => {
  const seconds = timeToSeconds(input);
  return secondsToTime(seconds);
};

export const calculateTotalTime = (items) => {
  let totalSeconds = 0;
  const count = items.length;
  if (count === 0) return "00:00";

  items.forEach(item => {
      // item.duration is expected to be a string "mm:ss"
      totalSeconds += timeToSeconds(item.duration);
  });

  // +10s rule
  if (count > 1) {
    totalSeconds += (count - 1) * 10;
  }

  return secondsToTime(totalSeconds);
};
