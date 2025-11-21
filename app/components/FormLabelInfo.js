function FormLabelInfo({ label, alt, onClick }) {
    return (
        <label className="form-label pointer" onClick={onClick}>{label} <i className="fa fa-info-circle info-icon" title={alt}></i></label>
    );
}

export default FormLabelInfo;