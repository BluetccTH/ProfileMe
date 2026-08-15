const fs = require('fs');

const path = 'src/components/Live2DAvatar.tsx';
let text = fs.readFileSync(path, 'utf8');

const start = text.indexOf('  const expressions = [');
const end = text.indexOf('  ];', start);
if (start === -1 || end === -1) throw new Error('Could not find expressions array');

const expressions = `  const expressions = [
    { id: 1, name: "Blushing", label: "เขิน / หน้าแดง", emoji: "😳" },
    { id: 2, name: "Heart eyes", label: "ตาหัวใจ", emoji: "😍" },
    { id: 3, name: "Sweat", label: "เหงื่อ", emoji: "😅" },
    { id: 4, name: "cry", label: "ร้องไห้", emoji: "😭" },
    { id: 5, name: "black face", label: "หน้ามืด / ดำ", emoji: "🖤" },
    { id: 6, name: "coat disappears", label: "ถอดเสื้อคลุม", emoji: "🧥" },
    { id: 7, name: "Controller", label: "Controller", emoji: "🎮" },
    { id: 8, name: "Microphone appears", label: "ไมค์ปรากฏ", emoji: "🎤" },
    { id: 9, name: "Microphone gesture", label: "ท่าถือไมค์", emoji: "🎙️" },
    { id: 10, name: "Microphone position", label: "ตำแหน่งไมค์", emoji: "📍" },
    { id: 11, name: "Microphone gesture without microphone", label: "ท่าไม่มีไมค์", emoji: "🤫" },
  ];`;
text = text.slice(0, start) + expressions + text.slice(end + '  ];'.length);

const applyStart = text.indexOf('  const applyExpression = (expId: number) => {');
const applyEnd = text.indexOf('\n  };', applyStart);
if (applyStart === -1 || applyEnd === -1) throw new Error('Could not find applyExpression');

const applyFn = `  const applyExpression = (expId: number) => {
    const model = modelRef.current;
    if (!model) return;

    const exp = expressions.find((e) => e.id === expId);
    if (!exp) return;

    try {
      const manager = model.internalModel?.motionManager?.expressionManager;
      if (manager && typeof manager.setExpression === "function") {
        if (currentExpression === expId) {
          if (typeof manager.stopAllExpressions === "function") manager.stopAllExpressions();
          setCurrentExpression(null);
        } else {
          manager.setExpression(exp.name);
          setCurrentExpression(expId);
        }
        return;
      }
    } catch (e) {
      console.warn("[Live2D Expression] Could not use expression manager:", e);
    }

    // Fallback for models/runtimes that do not expose ExpressionManager.
    const core = model.internalModel?.coreModel;
    if (!core) return;
    if (currentExpression === expId) {
      setCurrentExpression(null);
      return;
    }
    setCurrentExpression(expId);
    if (exp.name === "Blushing") core.setParameterValueById("ParamCheek", 1.0);
    if (exp.name === "Heart eyes") core.setParameterValueById("Param362", 1.0);
  };`;
text = text.slice(0, applyStart) + applyFn + text.slice(applyEnd + '\n  };'.length);

const resetStart = text.indexOf('  const resetPose = () => {');
const resetEnd = text.indexOf('\n  };', resetStart);
if (resetStart === -1 || resetEnd === -1) throw new Error('Could not find resetPose');

const resetFn = `  const resetPose = () => {
    targetPosRef.current.targetX = 0;
    targetPosRef.current.targetY = 0;
    setCurrentExpression(null);

    const model = modelRef.current;
    try {
      const manager = model?.internalModel?.motionManager?.expressionManager;
      if (manager && typeof manager.stopAllExpressions === "function") {
        manager.stopAllExpressions();
      }
    } catch (e) {}

    if (model?.internalModel?.coreModel) {
      const core = model.internalModel.coreModel;
      core.setParameterValueById("ParamCheek", 0.0);
      core.setParameterValueById("Param362", 0.0);
    }
  };`;
text = text.slice(0, resetStart) + resetFn + text.slice(resetEnd + '\n  };'.length);

fs.writeFileSync(path, text, 'utf8');
console.log('[Live2D] English model expressions enabled:', expressions.match(/name: \"[^\"]+/g)?.length || 0);
