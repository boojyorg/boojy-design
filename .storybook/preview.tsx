import type { Preview } from "@storybook/react-vite"
import "../src/index.css"

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "editor",
      values: [
        { name: "editor", value: "#0E0F14" },
        { name: "chrome", value: "#2C2C32" },
      ],
    },
  },
}

export default preview
