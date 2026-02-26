# WebLLM Models Comparison Sheet

> **Data Source**: Model sizes fetched from [HuggingFace mlc-ai repositories](https://huggingface.co/mlc-ai) on 2026-02-07.

> **Note on Sizes**: VRAM includes model weights + KV cache + runtime activations. Disk space represents only the model weights. The Disk/VRAM ratio varies by model size and quantization (typically 50-90%).

## Summary by Size Category

### Tiny Models (<1GB VRAM)

| Model ID | VRAM | Disk | Disk/VRAM % | Low Resource |
|----------|------|------|-------------|--------------|
| SmolLM2-360M-Instruct-q4f16_1-MLC | 376 MB | 198 MB | 53% | No |
| SmolLM2-360M-Instruct-q4f32_1-MLC | 580 MB | 198 MB | 34% | No |
| SmolLM2-135M-Instruct-q0f16-MLC | 360 MB | 260 MB | 72% | No |
| SmolLM2-135M-Instruct-q0f32-MLC | 719 MB | 260 MB | 36% | No |
| Qwen2.5-0.5B-Instruct-q4f16_1-MLC | 945 MB | 276 MB | 29% | No |
| Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC | 945 MB | 276 MB | 29% | No |
| Qwen2-0.5B-Instruct-q4f16_1-MLC | 945 MB | 276 MB | 29% | No |
| TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC | 697 MB | 593 MB | 85% | No |
| TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC | 840 MB | 593 MB | 71% | No |
| TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC | 697 MB | 593 MB | 85% | No |
| TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC | 840 MB | 593 MB | 71% | No |
| Llama-3.2-1B-Instruct-q4f16_1-MLC | 879 MB | 672 MB | 76% | No |
| TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k | 675 MB | N/A | N/A | No |
| TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k | 675 MB | N/A | N/A | No |
| SmolLM2-360M-Instruct-q0f16-MLC | 872 MB | 693 MB | 80% | No |
| TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC-1k | 796 MB | N/A | N/A | No |
| TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC-1k | 796 MB | N/A | N/A | No |

### Small Models (1-2GB VRAM)

| Model ID | VRAM | Disk | Disk/VRAM % | Low Resource |
|----------|------|------|-------------|--------------|
| Qwen2.5-0.5B-Instruct-q4f32_1-MLC | 1.04 GB | 276 MB | 26% | No |
| Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC | 1.04 GB | 276 MB | 26% | No |
| Qwen3-0.6B-q4f16_1-MLC | 1.37 GB | 335 MB | 24% | No |
| Qwen3-0.6B-q4f32_1-MLC | 1.88 GB | 335 MB | 17% | No |
| Llama-3.2-1B-Instruct-q4f32_1-MLC | 1.10 GB | 672 MB | 60% | No |
| SmolLM2-360M-Instruct-q0f32-MLC | 1.70 GB | 694 MB | 40% | No |
| phi-1_5-q4f16_1-MLC | 1.18 GB | 765 MB | 63% | No |
| phi-1_5-q4f32_1-MLC | 1.64 GB | 766 MB | 46% | No |
| Qwen2-Math-1.5B-Instruct-q4f16_1-MLC | 1.59 GB | 840 MB | 52% | No |
| Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC | 1.59 GB | 840 MB | 52% | No |
| Qwen2.5-1.5B-Instruct-q4f16_1-MLC | 1.59 GB | 840 MB | 52% | No |
| Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC | 1.59 GB | 840 MB | 52% | No |
| Qwen2-1.5B-Instruct-q4f16_1-MLC | 1.59 GB | 840 MB | 52% | No |
| Qwen2-Math-1.5B-Instruct-q4f32_1-MLC | 1.84 GB | 840 MB | 44% | No |
| Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC | 1.84 GB | 840 MB | 44% | No |
| Qwen2.5-1.5B-Instruct-q4f32_1-MLC | 1.84 GB | 840 MB | 44% | No |
| Qwen2.5-Math-1.5B-Instruct-q4f32_1-MLC | 1.84 GB | 840 MB | 44% | No |
| Qwen2-1.5B-Instruct-q4f32_1-MLC | 1.84 GB | 840 MB | 44% | No |
| SmolLM2-1.7B-Instruct-q4f16_1-MLC | 1.73 GB | 922 MB | 52% | No |
| Qwen3-1.7B-q4f16_1-MLC | 1.99 GB | 939 MB | 46% | No |
| Qwen2.5-0.5B-Instruct-q0f16-MLC | 1.59 GB | 953 MB | 59% | No |
| Qwen2.5-Coder-0.5B-Instruct-q0f16-MLC | 1.59 GB | 953 MB | 59% | No |
| Qwen2-0.5B-Instruct-q0f16-MLC | 1.59 GB | 953 MB | 59% | No |
| DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC | 1.59 GB | 960 MB | 59% | No |
| DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1-MLC | 1.84 GB | 961 MB | 51% | No |
| phi-1_5-q4f16_1-MLC-1k | 1.18 GB | N/A | N/A | No |
| gemma-2b-it-q4f16_1-MLC | 1.44 GB | 1.33 GB | 92% | No |
| gemma-2b-it-q4f32_1-MLC | 1.71 GB | 1.33 GB | 78% | No |
| gemma-2-2b-it-q4f16_1-MLC | 1.85 GB | 1.39 GB | 75% | No |
| gemma-2-2b-jpn-it-q4f16_1-MLC | 1.85 GB | 1.39 GB | 75% | No |
| gemma-2b-it-q4f16_1-MLC-1k | 1.44 GB | N/A | N/A | No |
| stablelm-2-zephyr-1_6b-q4f16_1-MLC-1k | 1.48 GB | N/A | N/A | No |
| gemma-2-2b-it-q4f16_1-MLC-1k | 1.55 GB | N/A | N/A | No |
| phi-1_5-q4f32_1-MLC-1k | 1.64 GB | N/A | N/A | No |
| gemma-2b-it-q4f32_1-MLC-1k | 1.71 GB | N/A | N/A | No |
| stablelm-2-zephyr-1_6b-q4f32_1-MLC-1k | 1.80 GB | N/A | N/A | No |
| gemma-2-2b-it-q4f32_1-MLC-1k | 1.84 GB | N/A | N/A | No |
| RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC-1k | 1.99 GB | N/A | N/A | No |

### Medium Models (2-4GB VRAM)

| Model ID | VRAM | Disk | Disk/VRAM % | Low Resource |
|----------|------|------|-------------|--------------|
| stablelm-2-zephyr-1_6b-q4f16_1-MLC | 2.04 GB | 890 MB | 43% | No |
| stablelm-2-zephyr-1_6b-q4f32_1-MLC | 2.93 GB | 890 MB | 30% | No |
| SmolLM2-1.7B-Instruct-q4f32_1-MLC | 2.63 GB | 922 MB | 34% | No |
| Qwen3-1.7B-q4f32_1-MLC | 2.57 GB | 939 MB | 36% | No |
| Qwen2.5-0.5B-Instruct-q0f32-MLC | 2.59 GB | 953 MB | 36% | No |
| Qwen2.5-Coder-0.5B-Instruct-q0f32-MLC | 2.59 GB | 953 MB | 36% | No |
| Qwen2-0.5B-Instruct-q0f32-MLC | 2.59 GB | 954 MB | 36% | No |
| Qwen3-0.6B-q0f16-MLC | 2.17 GB | 1.13 GB | 52% | No |
| Qwen3-0.6B-q0f32-MLC | 3.75 GB | 1.13 GB | 30% | No |
| gemma-2-2b-it-q4f32_1-MLC | 2.45 GB | 1.39 GB | 57% | No |
| gemma-2-2b-jpn-it-q4f32_1-MLC | 2.45 GB | 1.39 GB | 57% | No |
| RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC | 2.90 GB | 1.46 GB | 50% | No |
| phi-2-q4f16_1-MLC | 2.98 GB | 1.46 GB | 49% | No |
| phi-2-q4f32_1-MLC | 3.94 GB | 1.46 GB | 37% | No |
| RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC | 3.84 GB | 1.62 GB | 42% | No |
| Qwen2.5-3B-Instruct-q4f16_1-MLC | 2.45 GB | 1.63 GB | 67% | No |
| Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC | 2.45 GB | 1.63 GB | 67% | No |
| Qwen2.5-3B-Instruct-q4f32_1-MLC | 2.83 GB | 1.63 GB | 58% | No |
| Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC | 2.83 GB | 1.63 GB | 58% | No |
| Hermes-3-Llama-3.2-3B-q4f16_1-MLC | 2.21 GB | 1.69 GB | 77% | No |
| Llama-3.2-3B-Instruct-q4f16_1-MLC | 2.21 GB | 1.69 GB | 77% | No |
| Hermes-3-Llama-3.2-3B-q4f32_1-MLC | 2.88 GB | 1.69 GB | 59% | No |
| Llama-3.2-3B-Instruct-q4f32_1-MLC | 2.88 GB | 1.69 GB | 59% | No |
| Phi-3.5-mini-instruct-q4f16_1-MLC | 3.59 GB | 2.00 GB | 56% | No |
| Phi-3-mini-4k-instruct-q4f16_1-MLC | 3.59 GB | 2.00 GB | 56% | No |
| phi-2-q4f16_1-MLC-1k | 2.08 GB | N/A | N/A | No |
| Qwen3-4B-q4f16_1-MLC | 3.35 GB | 2.12 GB | 63% | No |
| Llama-3.2-1B-Instruct-q0f16-MLC | 2.51 GB | 2.31 GB | 92% | No |
| Phi-3.5-mini-instruct-q4f16_1-MLC-1k | 2.46 GB | N/A | N/A | No |
| Phi-3-mini-4k-instruct-q4f16_1-MLC-1k | 2.46 GB | N/A | N/A | No |
| RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC-1k | 2.50 GB | N/A | N/A | No |
| Phi-3.5-vision-instruct-q4f16_1-MLC | 3.86 GB | 2.58 GB | 67% | No |
| phi-2-q4f32_1-MLC-1k | 2.68 GB | N/A | N/A | No |
| Phi-3.5-mini-instruct-q4f32_1-MLC-1k | 3.10 GB | N/A | N/A | No |
| Phi-3-mini-4k-instruct-q4f32_1-MLC-1k | 3.10 GB | N/A | N/A | No |
| Hermes-2-Pro-Mistral-7B-q4f16_1-MLC | 3.94 GB | 3.80 GB | 96% | No |

### Large Models (4-7GB VRAM)

| Model ID | VRAM | Disk | Disk/VRAM % | Low Resource |
|----------|------|------|-------------|--------------|
| Phi-3-mini-4k-instruct-q4f32_1-MLC | 5.35 GB | 2.00 GB | 37% | No |
| Phi-3.5-mini-instruct-q4f32_1-MLC | 5.35 GB | 2.00 GB | 37% | No |
| Qwen3-4B-q4f32_1-MLC | 4.23 GB | 2.12 GB | 50% | No |
| Llama-3.2-1B-Instruct-q0f32-MLC | 4.99 GB | 2.31 GB | 46% | No |
| Phi-3.5-vision-instruct-q4f32_1-MLC | 5.74 GB | 2.58 GB | 45% | No |
| Llama-2-7b-chat-hf-q4f16_1-MLC | 6.59 GB | 3.53 GB | 54% | No |
| WizardMath-7B-V1.1-q4f16_1-MLC | 4.47 GB | 3.80 GB | 85% | No |
| NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC | 4.47 GB | 3.80 GB | 85% | No |
| Mistral-7B-Instruct-v0.2-q4f16_1-MLC | 4.47 GB | 3.80 GB | 85% | No |
| OpenHermes-2.5-Mistral-7B-q4f16_1-MLC | 4.47 GB | 3.80 GB | 85% | No |
| Mistral-7B-Instruct-v0.3-q4f16_1-MLC | 4.47 GB | 3.80 GB | 85% | No |
| Mistral-7B-Instruct-v0.3-q4f32_1-MLC | 5.49 GB | 3.80 GB | 69% | No |
| DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC | 4.99 GB | 4.00 GB | 80% | No |
| DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC | 5.76 GB | 4.00 GB | 69% | No |
| Qwen2-Math-7B-Instruct-q4f16_1-MLC | 4.99 GB | 4.00 GB | 80% | No |
| Qwen2.5-7B-Instruct-q4f16_1-MLC | 4.99 GB | 4.00 GB | 80% | No |
| Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC | 4.99 GB | 4.00 GB | 80% | No |
| Qwen2-7B-Instruct-q4f16_1-MLC | 4.99 GB | 4.00 GB | 80% | No |
| Qwen2-Math-7B-Instruct-q4f32_1-MLC | 5.76 GB | 4.00 GB | 69% | No |
| Qwen2.5-7B-Instruct-q4f32_1-MLC | 5.76 GB | 4.00 GB | 69% | No |
| Qwen2.5-Coder-7B-Instruct-q4f32_1-MLC | 5.76 GB | 4.00 GB | 69% | No |
| Qwen2-7B-Instruct-q4f32_1-MLC | 5.76 GB | 4.00 GB | 69% | No |
| DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC | 4.88 GB | 4.22 GB | 86% | No |
| Llama-3.1-8B-Instruct-q4f16_1-MLC | 4.88 GB | 4.22 GB | 86% | No |
| Hermes-2-Theta-Llama-3-8B-q4f16_1-MLC | 4.86 GB | 4.22 GB | 87% | No |
| Hermes-3-Llama-3.1-8B-q4f16_1-MLC | 4.76 GB | 4.22 GB | 89% | No |
| DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC | 5.96 GB | 4.22 GB | 71% | No |
| Llama-3-8B-Instruct-q4f16_1-MLC | 4.88 GB | 4.22 GB | 86% | No |
| Llama-3.1-8B-Instruct-q4f32_1-MLC | 5.96 GB | 4.22 GB | 71% | No |
| Hermes-2-Theta-Llama-3-8B-q4f32_1-MLC | 5.91 GB | 4.22 GB | 71% | No |
| Hermes-3-Llama-3.1-8B-q4f32_1-MLC | 5.64 GB | 4.22 GB | 75% | No |
| Llama-3-8B-Instruct-q4f32_1-MLC | 5.96 GB | 4.22 GB | 71% | No |
| Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC | 4.86 GB | 4.22 GB | 87% | No |
| Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC | 5.91 GB | 4.22 GB | 71% | No |
| Qwen3-8B-q4f16_1-MLC | 5.56 GB | 4.31 GB | 77% | No |
| Qwen3-8B-q4f32_1-MLC | 6.69 GB | 4.31 GB | 64% | No |
| Llama-3.1-8B-Instruct-q4f16_1-MLC-1k | 4.49 GB | N/A | N/A | No |
| Llama-3-8B-Instruct-q4f16_1-MLC-1k | 4.49 GB | N/A | N/A | No |
| Llama-2-7b-chat-hf-q4f16_1-MLC-1k | 4.51 GB | N/A | N/A | No |
| gemma-2-9b-it-q4f16_1-MLC | 6.27 GB | 4.86 GB | 78% | No |
| Llama-2-7b-chat-hf-q4f32_1-MLC-1k | 5.16 GB | N/A | N/A | No |
| Llama-3.1-8B-Instruct-q4f32_1-MLC-1k | 5.17 GB | N/A | N/A | No |
| Llama-3-8B-Instruct-q4f32_1-MLC-1k | 5.17 GB | N/A | N/A | No |

### Very Large Models (>8GB VRAM)

| Model ID | VRAM | Disk | Disk/VRAM % | Low Resource |
|----------|------|------|-------------|--------------|
| Llama-2-7b-chat-hf-q4f32_1-MLC | 8.90 GB | 3.93 GB | 44% | No |
| gemma-2-9b-it-q4f32_1-MLC | 8.19 GB | 4.86 GB | 59% | No |
| Llama-2-13b-chat-hf-q4f16_1-MLC | 11.54 GB | 6.82 GB | 59% | No |
| Llama-3.1-70B-Instruct-q3f16_1-MLC | 30.42 GB | 29.60 GB | 97% | No |
| Llama-3-70B-Instruct-q3f16_1-MLC | 30.42 GB | 29.60 GB | 97% | No |

### Embedding Models

| Model ID | VRAM | Disk | Disk/VRAM % | Low Resource |
|----------|------|------|-------------|--------------|
| snowflake-arctic-embed-s-q0f32-MLC-b4 | 239 MB | N/A | N/A | N/A |
| snowflake-arctic-embed-m-q0f32-MLC-b4 | 539 MB | N/A | N/A | N/A |
| snowflake-arctic-embed-s-q0f32-MLC-b32 | 1.00 GB | N/A | N/A | N/A |
| snowflake-arctic-embed-m-q0f32-MLC-b32 | 1.37 GB | N/A | N/A | N/A |

## Key Insights

### Size Range
- **Smallest model**: SmolLM2-360M-Instruct-q4f16_1-MLC - 198 MB disk / 376 MB VRAM
- **Largest model**: Llama-3-70B-Instruct-q3f16_1-MLC - 29.60 GB disk / 30.42 GB VRAM

### Disk-to-VRAM Ratio Patterns
- **Small models (<1GB)**: Typically 50-60% - proportionally more VRAM overhead
- **Medium models (1-3GB)**: Typically 70-80% - balanced ratio
- **Large models (>4GB)**: Typically 75-90% - model weights dominate
- **q4f32 vs q4f16**: q4f32 models have same disk size but higher VRAM, resulting in lower ratio

### Quantization Impact
- **q4f16_1** variants: Lower VRAM usage, best for memory-constrained devices
- **q4f32_1** variants: Same disk space as q4f16 but +15-25% VRAM for better precision
- **q0f16/q0f32** variants: Minimal quantization, highest VRAM requirements

### Context Window Variants
- Models with **-1k** suffix: 1024 token context vs 4096 default
- Primarily reduces VRAM (KV cache), minimal disk space impact
- Typically saves 15-20% VRAM with identical disk footprint
