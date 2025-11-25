import { EditableListItem } from './EditableListItem';
import { useState } from 'react';

export default {
  title: 'Design System/Molecules/EditableListItem',
  component: EditableListItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `EditableListItem is an inline editing component with an input field and save/cancel buttons.

**Features:**
- Text input with placeholder
- Save button (primary action)
- Cancel button (secondary action)
- Keyboard support (Enter to save, Escape to cancel)
- Auto-focus on mount
- Disabled state for save button
- Responsive sizing for mobile`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Current input value',
    },
    onChange: {
      action: 'changed',
      description: 'Input change handler',
    },
    onSave: {
      action: 'saved',
      description: 'Save button click handler',
    },
    onCancel: {
      action: 'cancelled',
      description: 'Cancel button click handler',
    },
    placeholder: {
      control: 'text',
      description: 'Input placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether save button is disabled',
    },
    autoFocus: {
      control: 'boolean',
      description: 'Whether to auto-focus the input',
    },
  },
};

/**
 * Default state - Empty input
 */
export const Default = {
  args: {
    value: '',
    placeholder: 'Enter name...',
    disabled: false,
    autoFocus: true,
  },
};

/**
 * With value - Pre-filled input
 */
export const WithValue = {
  args: {
    value: 'Alice Sterling',
    placeholder: 'Enter name...',
    disabled: false,
    autoFocus: true,
  },
};

/**
 * Disabled save - Empty input disables save button
 */
export const DisabledSave = {
  args: {
    value: '',
    placeholder: 'Enter name...',
    disabled: true,
    autoFocus: true,
  },
};

/**
 * Add character placeholder
 */
export const AddCharacter = {
  args: {
    value: '',
    placeholder: 'Character name...',
    disabled: false,
    autoFocus: true,
  },
};

/**
 * Add folder placeholder
 */
export const AddFolder = {
  args: {
    value: '',
    placeholder: 'Folder name...',
    disabled: false,
    autoFocus: true,
  },
};

/**
 * Interactive Example - Full editing flow
 */
export const Interactive = {
  render: () => {
    const [value, setValue] = useState('');
    const [items, setItems] = useState(['Alice Sterling', 'Bob Martinez', 'Charlie Davis']);
    const [isAdding, setIsAdding] = useState(false);

    const handleSave = () => {
      if (value.trim()) {
        setItems([...items, value.trim()]);
        setValue('');
        setIsAdding(false);
      }
    };

    const handleCancel = () => {
      setValue('');
      setIsAdding(false);
    };

    return (
      <div style={{ maxWidth: '500px' }}>
        <div style={{ marginBottom: '1rem' }}>
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                padding: '0.875rem 1rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <i className="fa fa-user" style={{ marginRight: '0.75rem', color: 'var(--text-muted)' }}></i>
              {item}
            </div>
          ))}
        </div>

        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: '6px',
              color: 'var(--accent)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <i className="fa fa-plus-circle" style={{ marginRight: '0.75rem' }}></i>
            Add Character
          </button>
        ) : (
          <EditableListItem
            value={value}
            onChange={setValue}
            onSave={handleSave}
            onCancel={handleCancel}
            placeholder="Character name..."
            disabled={!value.trim()}
            autoFocus
          />
        )}
      </div>
    );
  },
};

/**
 * Editing Existing Item - Shows edit vs. add use case
 */
export const EditingExisting = {
  render: () => {
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [items, setItems] = useState([
      { id: 1, name: 'Alice Sterling' },
      { id: 2, name: 'Bob Martinez' },
      { id: 3, name: 'Charlie Davis' },
    ]);

    const startEdit = (item) => {
      setEditingId(item.id);
      setEditValue(item.name);
    };

    const saveEdit = () => {
      if (editValue.trim()) {
        setItems(items.map(item =>
          item.id === editingId ? { ...item, name: editValue.trim() } : item
        ));
        setEditingId(null);
        setEditValue('');
      }
    };

    const cancelEdit = () => {
      setEditingId(null);
      setEditValue('');
    };

    return (
      <div style={{ maxWidth: '500px' }}>
        {items.map((item) => (
          editingId === item.id ? (
            <EditableListItem
              key={item.id}
              value={editValue}
              onChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              placeholder="Character name..."
              disabled={!editValue.trim()}
              autoFocus
            />
          ) : (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <i className="fa fa-user" style={{ color: 'var(--text-muted)' }}></i>
              <span style={{ flex: 1 }}>{item.name}</span>
              <button
                onClick={() => startEdit(item)}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-hover)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                <i className="fa fa-pencil"></i>
              </button>
            </div>
          )
        ))}
      </div>
    );
  },
};
