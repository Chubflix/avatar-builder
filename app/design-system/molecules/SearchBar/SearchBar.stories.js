import { SearchBar } from './SearchBar';

export default {
  title: 'Design System/Molecules/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
    onClear: { action: 'cleared' },
  },
};

export const Default = {
  args: {
    placeholder: 'Search folders...',
  },
};

export const WithValue = {
  args: {
    placeholder: 'Search folders...',
    value: 'My search query',
  },
};

export const CustomPlaceholder = {
  args: {
    placeholder: 'Type to search characters...',
  },
};

export const FullWidth = {
  args: {
    placeholder: 'Search...',
    className: 'full-width',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <Story />
      </div>
    ),
  ],
};
