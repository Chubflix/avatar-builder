import {useApp} from "../context/AppContext";

function GenerateButton({ onGenerate }) {
    const { state } = useApp();

    const {
        selectedModel,
        isGenerating,
    } = state;

    return (
        <button
            className={`btn-generate ${isGenerating ? 'loading' : ''}`}
            onClick={onGenerate}
            disabled={!selectedModel}
        >
            {isGenerating ? (
                <>
                    <div className="spinner"></div>
                    Generating...
                </>
            ) : (
                <>
                    <i className="fa fa-magic"></i>
                    Generate Images
                </>
            )}
        </button>
    );
}

export default GenerateButton;
