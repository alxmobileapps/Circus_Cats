"""Synthesises realistic-ish cat vocalisations as WAV files (additive harmonics + shaped breath noise).

Each sound = glottal source (harmonic stack with spectral tilt, jitter, vibrato, roughness)
shaped by time-varying formants (mouth shape) + aspiration noise shaped by the same formants.
"""
import numpy as np, scipy.signal as sg, scipy.io.wavfile as wf, sys, os

SR = 22050
rng = np.random.default_rng(7)

def interp(keys, u):
    """keys: list of (u, value or tuple). Linear interpolation, returns array (n,) or (n, m)."""
    us = np.array([k[0] for k in keys]); vs = np.array([k[1] for k in keys], dtype=float)
    if vs.ndim == 1: return np.interp(u, us, vs)
    return np.stack([np.interp(u, us, vs[:, j]) for j in range(vs.shape[1])], axis=1)

def smooth_noise(n, cutoff_hz, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    x = r.standard_normal(n)
    b, a = sg.butter(2, cutoff_hz / (SR / 2))
    y = sg.filtfilt(b, a, x)
    return y / (np.std(y) + 1e-9)

def envelope_db(freqs, F, BW, G):
    """Formant envelope magnitude at freqs (n,K) given per-sample formants F,BW,G (n,M)."""
    env = np.zeros_like(freqs)
    for j in range(F.shape[1]):
        x = (freqs - F[:, j:j+1]) / (BW[:, j:j+1] / 2)
        env += G[:, j:j+1] / np.sqrt(1 + x * x)      # resonance magnitude
    return env

def voice(dur, f0_keys, form_keys, amp_keys, tilt=1.1, breath=0.08, breath_keys=None,
          jitter=0.012, vib=(6.0, 0.012), rough=0.0, rough_hz=30.0, sub=0.0, kmax=60, seed=None):
    n = int(SR * dur); t = np.arange(n) / SR; u = t / dur
    f0 = interp(f0_keys, u)
    f0 = f0 * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t + rng.uniform(0, 6)))
    f0 = f0 * (1 + jitter * smooth_noise(n, 40, seed))
    phase = 2 * np.pi * np.cumsum(f0) / SR
    fk = interp(form_keys, u)                       # (n, 9): F1,B1,G1,F2,B2,G2,F3,B3,G3...
    M = fk.shape[1] // 3
    F, BW, G = fk[:, 0::3], fk[:, 1::3], fk[:, 2::3]
    K = int(min(kmax, (SR / 2 * 0.92) / max(60, f0.min())))
    ks = np.arange(1, K + 1)
    freqs = f0[:, None] * ks[None, :]
    mag = envelope_db(freqs, F, BW, G) * ks[None, :] ** (-tilt)
    mag[freqs > SR / 2 * 0.92] = 0
    ph0 = rng.uniform(0, 2 * np.pi, K)
    y = np.sum(mag * np.sin(phase[:, None] * ks[None, :] + ph0[None, :]), axis=1)
    if sub:  # subharmonic (rough, growly voices)
        y += sub * np.sum(mag[:, :K//2] * np.sin(phase[:, None] * (ks[:K//2] - 0.5)[None, :]), axis=1)
    if rough:
        am = 1 + rough * np.sin(2 * np.pi * rough_hz * t + 1.3 * smooth_noise(n, 8, seed))
        y *= am
    # aspiration / breath noise, shaped by the same formants (STFT filtering)
    nz = rng.standard_normal(n)
    f, tt, Z = sg.stft(nz, SR, nperseg=512)
    uu = np.clip(tt / dur, 0, 1)
    fkz = interp(form_keys, uu)
    Fz, Bz, Gz = fkz[:, 0::3], fkz[:, 1::3], fkz[:, 2::3]
    envz = envelope_db(np.tile(f[None, :], (len(uu), 1)), Fz, Bz * 1.6, Gz).T * (f[:, None] / 500 + 1) ** -0.4
    _, nzs = sg.istft(Z * envz, SR, nperseg=512)
    nzs = nzs[:n] if len(nzs) >= n else np.pad(nzs, (0, n - len(nzs)))
    bk = interp(breath_keys, u) if breath_keys else np.full(n, 1.0)
    y = y / (np.max(np.abs(y)) + 1e-9) + breath * bk * nzs / (np.max(np.abs(nzs)) + 1e-9) * 3
    a = interp(amp_keys, u)
    return y * a

def noise_burst(dur, lo, hi, amp_keys, seed=None):
    n = int(SR * dur); u = np.arange(n) / n
    x = np.random.default_rng(seed).standard_normal(n)
    sos = sg.butter(4, [lo / (SR / 2), min(0.99, hi / (SR / 2))], 'band', output='sos')
    y = sg.sosfilt(sos, x); y /= np.max(np.abs(y)) + 1e-9
    return y * interp(amp_keys, u)

def cat(*parts):
    return np.concatenate(parts)

def silence(s): return np.zeros(int(SR * s))

def finish(y, name, peak=0.89):
    y = y - np.mean(y)
    fade = int(0.006 * SR); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    os.makedirs(OUT, exist_ok=True)
    wf.write(os.path.join(OUT, name + '.wav'), SR, (y * 32767).astype(np.int16))
    return y

# ---- mouth shapes: (F1,B1,G1, F2,B2,G2, F3,B3,G3, F4,B4,G4) ----
def mouth(f1, f2, f3=3300, f4=4400, g=(1.0, 0.7, 0.35, 0.18), b=(160, 200, 280, 380)):
    return (f1, b[0], g[0], f2, b[1], g[1], f3, b[2], g[2], f4, b[3], g[3])
M_CLOSED = mouth(350, 1700, 3000, 4200, g=(1.0, 0.25, 0.1, 0.05), b=(120, 260, 350, 450))   # "mm"
M_EE     = mouth(700, 2400, 3400, 4500, g=(1.0, 0.9, 0.45, 0.2))                                # "ee/eh"
M_AA     = mouth(1150, 1850, 3100, 4300, g=(1.0, 0.8, 0.35, 0.15), b=(200, 220, 300, 400))     # "aa"
M_OO     = mouth(800, 1250, 2900, 4100, g=(1.0, 0.55, 0.2, 0.08))                               # "oh"
M_UU     = mouth(500, 950, 2700, 4000, g=(1.0, 0.4, 0.12, 0.05))                                # "oo/w"

def meow(dur=0.72, f0=(520, 800, 740, 520, 470), rasp=0.0, seed=None, nasal=0.13, vibd=0.012):
    """'m-ee-AA-ow' : the classic domestic meow."""
    a, pk, mid, lo, end = f0
    return voice(dur,
        [(0, a), (0.18, pk * 0.95), (0.38, pk), (0.6, mid), (0.85, lo), (1, end)],
        [(0, M_CLOSED), (nasal, M_CLOSED), (nasal + 0.12, M_EE), (0.42, M_AA), (0.62, M_AA), (0.82, M_OO), (1, M_UU)],
        [(0, 0.0), (0.04, 0.35), (nasal + 0.06, 0.55), (0.3, 1.0), (0.65, 0.95), (0.88, 0.5), (1, 0.0)],
        tilt=0.9 - 0.35 * rasp, breath=0.025 + 0.12 * rasp, rough=0.25 * rasp, rough_hz=55,
        jitter=0.012 + 0.02 * rasp, vib=(6.5, vibd), seed=seed)

def mew(dur=0.32, f0=(680, 860, 640), seed=None, sad=False):
    """short kitten 'mew'."""
    a, pk, end = f0
    return voice(dur,
        [(0, a), (0.35, pk), (1, end)],
        [(0, M_CLOSED), (0.12, M_EE), (0.55, M_AA), (1, M_OO)],
        [(0, 0.0), (0.08, 0.6), (0.35, 1.0), (0.7, 0.8), (1, 0.0)],
        tilt=0.95, breath=0.05 if sad else 0.03, vib=(7.5, 0.03 if sad else 0.01), seed=seed)

def chirp(seed=None):
    """'mrrp!' trill: rising, closed-mouth, fast amplitude flutter."""
    y = voice(0.30,
        [(0, 430), (0.6, 640), (1, 860)],
        [(0, M_CLOSED), (0.5, mouth(520, 1500, 3000, 4200, g=(1, 0.5, 0.2, 0.1))), (0.85, M_EE), (1, M_CLOSED)],
        [(0, 0.0), (0.08, 0.9), (0.8, 1.0), (1, 0.0)],
        tilt=1.0, breath=0.02, rough=0.85, rough_hz=27, vib=(6, 0.0), seed=seed)
    return y

def roar(seed=None):
    """big-cat roar: low, rough, swelling 'aaaOOUURRR'."""
    return voice(1.5,
        [(0, 95), (0.25, 165), (0.5, 150), (0.8, 110), (1, 80)],
        [(0, mouth(450, 950, 2300, 3300, g=(1, 0.6, 0.35, 0.2), b=(180, 220, 320, 420))),
         (0.3, mouth(700, 1250, 2500, 3500, g=(1, 0.8, 0.45, 0.25), b=(200, 250, 350, 450))),
         (0.7, mouth(560, 1000, 2400, 3400, g=(1, 0.6, 0.35, 0.2), b=(200, 250, 350, 450))),
         (1, mouth(400, 800, 2200, 3200, g=(1, 0.4, 0.2, 0.1)))],
        [(0, 0.0), (0.12, 0.6), (0.3, 1.0), (0.6, 0.9), (0.85, 0.45), (1, 0.0)],
        tilt=0.55, breath=0.22, breath_keys=[(0, 1.4), (0.3, 1.0), (1, 1.6)], jitter=0.05,
        vib=(4, 0.02), rough=0.75, rough_hz=32, sub=0.55, kmax=110, seed=seed)

def saw_grunt(d, seed=None):
    return voice(d, [(0, 120), (0.4, 150), (1, 95)],
        [(0, mouth(500, 1000, 2300, 3300)), (1, mouth(420, 900, 2200, 3200))],
        [(0, 0.0), (0.2, 1.0), (0.7, 0.8), (1, 0.0)],
        tilt=0.5, breath=0.9, jitter=0.07, rough=0.9, rough_hz=38, sub=0.6, kmax=100, seed=seed)

def snarl(seed=None):
    """hiss + growl (wild small cats, snow leopard, lynx...)."""
    h = noise_burst(0.22, 2500, 9500, [(0, 0), (0.1, 1), (0.7, 0.8), (1, 0)], seed)
    g = voice(0.45, [(0, 170), (0.4, 210), (1, 150)],
        [(0, mouth(650, 1500, 2700, 3800)), (1, mouth(550, 1300, 2600, 3700))],
        [(0, 0.0), (0.15, 1.0), (0.7, 0.85), (1, 0.0)],
        tilt=0.6, breath=0.6, jitter=0.06, rough=0.85, rough_hz=36, sub=0.4, kmax=90, seed=seed)
    y = np.zeros(int(SR * 0.6)); y[:len(h)] += 0.5 * h; s = int(0.12 * SR); y[s:s + len(g)] += g[:len(y) - s]
    return y

def cry_long(seed=None):
    """sad, drawn-out 'meeeaaaooowww' with wobbling voice."""
    return voice(1.25,
        [(0, 620), (0.15, 820), (0.35, 760), (0.6, 600), (0.85, 470), (1, 380)],
        [(0, M_CLOSED), (0.08, M_CLOSED), (0.2, M_EE), (0.45, M_AA), (0.7, M_OO), (1, M_UU)],
        [(0, 0.0), (0.05, 0.4), (0.2, 1.0), (0.6, 0.9), (0.9, 0.45), (1, 0.0)],
        tilt=0.95, breath=0.05, breath_keys=[(0, 1), (0.7, 1.2), (1, 2.0)], jitter=0.02, vib=(7.0, 0.035), seed=seed)

def yowl(seed=None):
    """long wavering Siamese-style wail 'mraaow-waaow'."""
    n = 1.8
    return voice(n,
        [(0, 430), (0.12, 640), (0.3, 720), (0.45, 580), (0.6, 690), (0.8, 520), (1, 400)],
        [(0, M_CLOSED), (0.1, M_EE), (0.28, M_AA), (0.42, M_OO), (0.56, M_AA), (0.78, M_OO), (1, M_UU)],
        [(0, 0.0), (0.06, 0.6), (0.25, 1.0), (0.42, 0.75), (0.58, 1.0), (0.85, 0.6), (1, 0.0)],
        tilt=0.75, breath=0.07, jitter=0.03, vib=(5.5, 0.03), rough=0.2, rough_hz=50, seed=seed)

def big_cry(seed=None):
    """big-cat sad moan: low 'aaouuuuu' groan."""
    return voice(1.7,
        [(0, 230), (0.2, 260), (0.6, 190), (1, 120)],
        [(0, mouth(700, 1200, 2500, 3500)), (0.5, mouth(600, 1000, 2400, 3400)), (1, mouth(420, 800, 2200, 3200, g=(1, 0.4, 0.2, 0.1)))],
        [(0, 0.0), (0.1, 0.8), (0.4, 1.0), (0.85, 0.5), (1, 0.0)],
        tilt=0.7, breath=0.18, jitter=0.04, vib=(5, 0.04), rough=0.45, rough_hz=30, sub=0.3, kmax=90, seed=seed)

if __name__ == '__main__':
    OUT = sys.argv[1]
    finish(meow(seed=1), 'meow-1')
    finish(meow(0.62, f0=(560, 860, 760, 560, 500), seed=2, nasal=0.1), 'meow-2')
    finish(meow(0.8, f0=(500, 760, 720, 540, 440), seed=3, nasal=0.16), 'meow-3')
    finish(meow(0.9, f0=(600, 900, 820, 600, 470), rasp=1.0, seed=4, nasal=0.08, vibd=0.02), 'meow-rasp')
    finish(cat(chirp(5), silence(0.02)), 'chirp')
    finish(roar(6), 'roar')
    finish(cat(saw_grunt(0.24, 7), silence(0.1), saw_grunt(0.22, 8), silence(0.1), saw_grunt(0.2, 9)), 'roar-saw')
    finish(snarl(10), 'snarl')
    finish(cat(mew(0.3, (700, 880, 660), 11, True), silence(0.14), mew(0.3, (690, 860, 620), 12, True), silence(0.16), cry_long(13)), 'cry')
    finish(yowl(14), 'cry-yowl')
    finish(cat(big_cry(15), silence(0.15)), 'cry-big')
    print('ok')
