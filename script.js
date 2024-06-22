// Set up audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let oscillators = null;
let gainNodes = null;

// Get DOM elements
const equationInput = document.getElementById('equation');
const playButton = document.getElementById('play');
const stopButton = document.getElementById('stop');
const durationInput = document.getElementById('duration');
const waveformSelect = document.getElementById('waveform');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

// Add event listeners
playButton.addEventListener('click', playSound);
stopButton.addEventListener('click', stopSound);

// Function to play sound
function playSound() {
    // We'll implement this later
    console.log('Play button clicked');
}

// Function to stop sound
function stopSound() {
    // We'll implement this later
    console.log('Stop button clicked');
}


function generateFrequencies(equation, duration) {
    const frequencies = [];
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
        const x = i / steps;
        const time = x * duration;
        try {
            let results = math.evaluate(equation, { x });
            if (!Array.isArray(results)) {
                results = [results];
            }
            const freqs = results.map(result => {
                if (isNaN(result)) {
                    throw new Error("Invalid result: NaN");
                }
                return Math.abs(result) * 100 + 100; // Scale the result to audible frequencies
            });
            frequencies.push({ time, freqs });
        } catch (error) {
            console.error('Error evaluating equation:', error);
            alert(`Error in equation: ${error.message}`);
            return [];
        }
    }
    
    return frequencies;
}


function playSound() {
    stopSound();
    
    const equation = equationInput.value;
    const duration = parseFloat(durationInput.value);
    const waveform = waveformSelect.value;
    
    const frequencies = generateFrequencies(equation, duration);
    const now = audioContext.currentTime;
    
    const maxOscillators = Math.max(...frequencies.map(f => f.freqs.length));
    oscillators = [];
    gainNodes = [];
    
    for (let i = 0; i < maxOscillators; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = waveform;
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(1 / maxOscillators, now);
        
        frequencies.forEach(({ time, freqs }) => {
            if (i < freqs.length) {
                oscillator.frequency.setValueAtTime(freqs[i], now + time);
            } else {
                oscillator.frequency.setValueAtTime(0, now + time);
            }
        });
        
        oscillator.start();
        oscillator.stop(now + duration);
        
        oscillators.push(oscillator);
        gainNodes.push(gainNode);
    }
    
    visualize(frequencies);
}

function stopSound() {
    if (oscillators) {
        oscillators.forEach(osc => {
            osc.stop();
            osc.disconnect();
        });
        oscillators = null;
    }
    if (gainNodes) {
        gainNodes.forEach(gain => {
            gain.disconnect();
        });
        gainNodes = null;
    }
}

function visualize(frequencies) {
    const width = canvas.width;
    const height = canvas.height;
    
    canvasCtx.clearRect(0, 0, width, height);
    
    const colors = ['#4CAF50', '#2196F3', '#FFC107', '#E91E63'];
    
    const maxSolutions = Math.max(...frequencies.map(f => f.freqs.length));
    
    for (let i = 0; i < maxSolutions; i++) {
        canvasCtx.strokeStyle = colors[i % colors.length];
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        
        frequencies.forEach(({ time, freqs }, index) => {
            const x = (time / frequencies[frequencies.length - 1].time) * width;
            const y = height - (freqs[i] ? (freqs[i] / 1000) * height : height);
            
            if (index === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
        });
        
        canvasCtx.stroke();
    }

    // Add frequency labels
    canvasCtx.fillStyle = '#333';
    canvasCtx.font = '12px Arial';
    for (let i = 0; i < maxSolutions; i++) {
        const lastFreq = frequencies[frequencies.length - 1].freqs[i];
        if (lastFreq) {
            canvasCtx.fillText(`${Math.round(lastFreq)} Hz`, width - 50, height - (lastFreq / 1000) * height - 5);
        }
    }

    // Add time axis
    canvasCtx.strokeStyle = '#999';
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, height);
    canvasCtx.lineTo(width, height);
    canvasCtx.stroke();

    for (let i = 0; i <= 5; i++) {
        const x = (i / 5) * width;
        canvasCtx.fillText(`${i}s`, x, height - 5);
    }
}

const presetSelect = document.getElementById('presets');

presetSelect.addEventListener('change', function() {
    equationInput.value = this.value;
});

