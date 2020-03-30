import React from 'react';
import 'jsoneditor-react/es/editor.min.css';
import { JsonEditor } from 'jsoneditor-react';

const Editor = ({ json, onChange }) => (
  <JsonEditor
    allowedModes={['tree', 'code']}
    value={json}
    onChange={onChange}
  />
);

export default Editor;
