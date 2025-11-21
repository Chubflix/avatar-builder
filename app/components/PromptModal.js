import {useApp} from "../context/AppContext";
import GenerateButton from "./GenerateButton";

function PromptModal({ onGenerate }) {
    const { state, actions, dispatch } = useApp();
    const { showPromptModal, positivePrompt } = state;

    if (!showPromptModal) return null;

    const handleClose = () => {
        dispatch({ type: actions.SET_SHOW_PROMPT_MODAL, payload: false });
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div style={{ display: 'flex', flexDirection: 'column' }} className="modal-content wide" onClick={(e) => e.stopPropagation()}>
                <h2>Positive Prompt</h2>
                <textarea
                    className="form-textarea form-textarea-static"
                    value={positivePrompt}
                    onChange={(e) => dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: e.target.value })}
                    placeholder="masterpiece, best quality, 1girl, portrait..."
                />
                <GenerateButton onGenerate={onGenerate} />
            </div>
        </div>
    );
}

export default PromptModal;