// Splash/Home transition logic

document.addEventListener('DOMContentLoaded', function() {
  // Animate splashTitle word by word
  const splashWords = document.querySelectorAll('#splashTitle .splash-word');
  splashWords.forEach((word, idx) => {
    setTimeout(() => {
      word.style.opacity = 1;
      word.style.transform = 'translateY(0) scale(1.08)';
      word.style.transition = 'opacity 0.7s, transform 0.7s';
    }, 400 + idx * 600);
  });
  setTimeout(function() {
    document.getElementById('splashDesc').style.opacity = 1;
  }, 1800);
  setTimeout(function() {
    document.getElementById('getStartedBtn').style.opacity = 1;
  }, 2400);
  document.getElementById('getStartedBtn').onclick = function() {
    document.getElementById('splashPage').style.animation = 'fadeOutSplash 0.8s forwards';
    setTimeout(function() {
      document.getElementById('splashPage').style.display = 'none';
      document.querySelector('.sidebar').style.display = 'flex';
      document.getElementById('translatePage').style.display = 'flex';
      welcomeMessage();
    }, 800);
  };

  // Offline detection logic
  function updateOfflineStatus() {
    var offlineMsg = document.getElementById('offline-message');
    var languageSelect = document.getElementById('language');
    if (!navigator.onLine) {
      offlineMsg.style.display = 'block';
      languageSelect.disabled = true;
    } else {
      offlineMsg.style.display = 'none';
      languageSelect.disabled = false;
    }
  }
  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);
  updateOfflineStatus();
});

// Sidebar navigation logic
function showPage(page) {
  document.getElementById('translatePage').style.display = 'none';
  document.getElementById('historyPage').style.display = 'none';
  document.getElementById('settingsPage').style.display = 'none';
  document.getElementById('aboutPage').style.display = 'none';
  document.getElementById(page + 'Page').style.display = 'flex';
}
const transcriptBox = document.getElementById("transcript");
const translatedBox = document.getElementById("translated");
const toggleBtn = document.getElementById("themeToggle");
const colorPicker = document.getElementById("colorPicker");
let recognition;
let transcriptHistory = [];
let translationHistory = [];

function welcomeMessage() {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance("Welcome to the Speech Translator. Click Get Started to begin.");
  utterance.rate = 1;
  utterance.pitch = 1;
  synth.speak(utterance);
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");
  const isLight = document.body.classList.contains("light-mode");
  toggleBtn.textContent = isLight ? "☀️" : "🌙";
}

// Allow users to pick their own color theme
colorPicker.addEventListener('input', function(e) {
  const color = e.target.value;
  document.documentElement.style.setProperty('--primary', color);
  document.documentElement.style.setProperty('--primary-hover', shadeColor(color, -15));
  // Optionally update mic/frequency colors
  document.querySelectorAll('.mic-svg, #mic-bg svg rect, #mic-bg svg circle').forEach(el => {
    if (el.tagName === 'rect' || el.tagName === 'circle') {
      el.setAttribute('fill', color);
    }
  });
});

// Helper to shade color for hover effect
function shadeColor(color, percent) {
  let R = parseInt(color.substring(1,3),16);
  let G = parseInt(color.substring(3,5),16);
  let B = parseInt(color.substring(5,7),16);
  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);
  R = (R<255)?R:255;  G = (G<255)?G:255;  B = (B<255)?B:255;
  const RR = ((R.toString(16).length==1)?"0":"") + R.toString(16);
  const GG = ((G.toString(16).length==1)?"0":"") + G.toString(16);
  const BB = ((B.toString(16).length==1)?"0":"") + B.toString(16);
  return "#"+RR+GG+BB;
}

function startRecognition() {
  if (recognition) recognition.abort();
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = ""; // Let browser auto-detect language
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 5;

  let finalTranscript = "";
  let lastFinal = "";
  let liveInterim = "";
  let writing = false;

  recognition.onresult = async function (event) {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      let transcript = event.results[i][0].transcript.trim();
      if (event.results[i].isFinal) {
        if (transcript !== lastFinal) {
          finalTranscript += transcript + "\n";
          transcriptHistory.push(transcript);
          updateHistory('transcript');
          lastFinal = transcript;
          // Translate only final results
          const lang = document.getElementById("language").value;
          let detectedLang = '';
          if (!navigator.onLine) {
            translatedBox.value += '[Offline: Translation unavailable]\n';
          } else {
            try {
              const response = await fetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(transcript)}`
              );
              const data = await response.json();
              const translatedText = data[0][0][0];
              translatedBox.value += translatedText + "\n";
              translationHistory.push(translatedText);
              updateHistory('translated');
              detectedLang = data[2];
              if (detectedLang) {
                document.getElementById('detected-lang').textContent = `Detected Input Language: ${getLanguageName(detectedLang)}`;
              }
            } catch (error) {
              translatedBox.value += `[Error: ${error.message}]\n`;
            }
          }
        }
      } else {
        interimTranscript += transcript;
        liveInterim = transcript;
      }
    }
    transcriptBox.value = finalTranscript + interimTranscript;
    // Simulate live writing effect
    if (liveInterim && !writing) {
      writing = true;
      let idx = 0;
      function typeLive() {
        if (idx <= liveInterim.length) {
          transcriptBox.value = finalTranscript + liveInterim.slice(0, idx);
          idx++;
          setTimeout(typeLive, 18); // Fast typing effect
        } else {
          writing = false;
        }
      }
      typeLive();
    }
  };

  recognition.onerror = function (event) {
    transcriptBox.value += `[Error: ${event.error}]\n`;
  };

  recognition.onend = function() {
    document.getElementById("mic-anim").style.display = "none";
  };

  recognition.start();
  document.getElementById("mic-anim").style.display = "block";
}

function stopRecognition() {
  if (recognition) {
    recognition.stop();
    // mic-anim will be hidden in recognition.onend
  }
}

function downloadText(type) {
  let text = type === 'transcript' ? transcriptBox.value : translatedBox.value;
  let filename = type === 'transcript' ? 'transcript.txt' : 'translation.txt';
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function updateHistory(type) {
  let historyArr = type === 'transcript' ? transcriptHistory : translationHistory;
  let historyDiv = document.getElementById(type === 'transcript' ? 'transcript-history' : 'translation-history');
  historyDiv.innerHTML = '<b>History:</b><ul style="padding-left:18px;">' + historyArr.map(item => `<li>${item}</li>`).join('') + '</ul>';

  // Also update sidebar history page
  if (type === 'transcript') {
    document.getElementById('history-transcript-list').innerHTML = historyArr.map(item => `<li>${item}</li>`).join('');
  } else {
    document.getElementById('history-translation-list').innerHTML = historyArr.map(item => `<li>${item}</li>`).join('');
  }
}
// Helper to get language name from code
function getLanguageName(code) {
  const langMap = {
    'en': 'English', 'hi': 'Hindi', 'or': 'Odia', 'fr': 'French', 'es': 'Spanish', 'de': 'German',
    'ta': 'Tamil', 'te': 'Telugu', 'bn': 'Bengali', 'gu': 'Gujarati', 'ml': 'Malayalam', 'ja': 'Japanese',
    'zh-CN': 'Chinese (Simplified)', 'ar': 'Arabic', 'ru': 'Russian', 'it': 'Italian', 'pt': 'Portuguese',
    'ko': 'Korean', 'tr': 'Turkish', 'pl': 'Polish', 'vi': 'Vietnamese', 'ur': 'Urdu', 'th': 'Thai',
    'nl': 'Dutch', 'el': 'Greek', 'sv': 'Swedish', 'cs': 'Czech', 'fi': 'Finnish', 'hu': 'Hungarian',
    'he': 'Hebrew', 'id': 'Indonesian', 'ro': 'Romanian', 'sk': 'Slovak', 'uk': 'Ukrainian',
    'tl': 'Filipino', 'no': 'Norwegian'
  };
  return langMap[code] || code;
}

// Add clearText function for transcript and translated output
function clearText(type) {
  if (type === 'transcript') {
    transcriptBox.value = '';
    transcriptHistory = [];
    document.getElementById('transcript-history').innerHTML = '';
    document.getElementById('detected-lang').textContent = '';
  } else if (type === 'translated') {
    translatedBox.value = '';
    translationHistory = [];
    document.getElementById('translation-history').innerHTML = '';
  }
}
