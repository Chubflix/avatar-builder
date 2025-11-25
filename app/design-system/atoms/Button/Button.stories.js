import { Button } from './Button';

export default {
  title: 'Design System/Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: 'boolean',
    },
    onClick: { action: 'clicked' },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Generate',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Cancel',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
};

export const Small = {
  args: {
    size: 'small',
    children: 'Small Button',
  },
};

export const Medium = {
  args: {
    size: 'medium',
    children: 'Medium Button',
  },
};

export const Large = {
  args: {
    size: 'large',
    children: 'Large Button',
  },
};

export const Disabled = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const WithIcon = {
  args: {
    children: (
      <>
        <i className="fa fa-magic" style={{ marginRight: '8px' }}></i>
        Generate
      </>
    ),
  },
};
