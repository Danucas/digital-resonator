function gainEnvelop(when, duration, env, gainNode, ctx) {
    let commonFactor = duration;
    let A = Number(env.attack);
    let H = Number(env.hold);
    let D = Number(env.decay);
    let S = Number(env.sustain);
    let R = Number(env.release);

    let base = A + H + D + S + R;
    let basePorcentaje = 100;

    A = ((A * basePorcentaje / base) /100) * commonFactor;
    H = ((H * basePorcentaje / base) /100) * commonFactor;
    D = ((D * basePorcentaje / base) /100) * commonFactor;
    // S = ((S * basePorcentaje / base) /100) * commonFactor;
    R = ((R * basePorcentaje / base) /100) * commonFactor;
    
    gainNode.gain.cancelScheduledValues(0);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.setValueCurveAtTime(new Float32Array([0, 1]), when, A);
    gainNode.gain.setValueCurveAtTime(new Float32Array([1, S]), when + A + H, D);
    gainNode.gain.setValueCurveAtTime(new Float32Array([S, 0]), when + duration, R);
}

export {
    gainEnvelop
}