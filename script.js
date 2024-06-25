const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let oscillators = null;
let gainNodes = null;

const equationInput = document.getElementById('equation');
const playButton = document.getElementById('play');
const stopButton = document.getElementById('stop');
const durationInput = document.getElementById('duration');
const waveformSelect = document.getElementById('waveform');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

playButton.addEventListener('click', playSound);
stopButton.addEventListener('click', stopSound);

function generateFrequencies(equation, duration) {
    const frequencies = [];
    const steps = 1000; // Increased for smoother sound
    
    for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * 10; // Scale x from 0 to 10 for more interesting results
        const time = (i / steps) * duration;
        try {
            let result = math.evaluate(equation, { x });
            
            // Handle complex numbers
            if (math.typeOf(result) === 'Complex') {
                result = math.abs(result);
            }
            
            // Handle arrays or matrices
            if (Array.isArray(result) || math.typeOf(result) === 'Matrix') {
                result = math.mean(result);
            }
            
            // Ensure result is a number
            if (typeof result !== 'number') {
                throw new Error("Result is not a number");
            }
            
            // Map to audible frequencies (20 Hz to 20000 Hz)
            const freq = math.map(result, -10, 10, 20, 20000);
            
            frequencies.push({ time, freq });
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
    
    // Create a master gain node for overall volume control
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.5, now);
    masterGain.connect(audioContext.destination);
    
    // Create a low-pass filter for smoother sound
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(5000, now);
    filter.Q.setValueAtTime(1, now);
    filter.connect(masterGain);
    
    // Create a compressor to even out volume
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, now);
    compressor.knee.setValueAtTime(40, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0, now);
    compressor.release.setValueAtTime(0.25, now);
    compressor.connect(filter);
    
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    oscillator.type = waveform;
    oscillator.connect(gainNode);
    gainNode.connect(compressor);
    
    // Smoother attack and release
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, now + duration - 0.1);
    
    frequencies.forEach(({ time, freq }) => {
        oscillator.frequency.setValueAtTime(freq, now + time);
    });
    
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    visualize(frequencies);
}

function stopSound() {
    if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        oscillator = null;
    }
    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }
}

function visualize(frequencies) {
    const width = canvas.width;
    const height = canvas.height;
    
    canvasCtx.clearRect(0, 0, width, height);
    canvasCtx.strokeStyle = '#4CAF50';
    canvasCtx.lineWidth = 2;
    
    canvasCtx.beginPath();
    frequencies.forEach(({ time, freq }, index) => {
        const x = (time / frequencies[frequencies.length - 1].time) * width;
        const y = height - (freq / 20000) * height;
        
        if (index === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }
    });
    canvasCtx.stroke();
    
    // Add frequency labels
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = '12px Arial';
    canvasCtx.fillText(`${Math.round(frequencies[0].freq)} Hz`, 10, height - 10);
    canvasCtx.fillText(`${Math.round(frequencies[frequencies.length - 1].freq)} Hz`, width - 60, height - 10);
}

