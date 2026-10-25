export interface ShaderMessage {
  shader: string;
  type: GPUCompilationMessageType;
  message: string;
  line: number;
  column: number;
}

/**
 * Compiles each WGSL module once and reports compiler messages (errors and
 * warnings with line numbers) to the diagnostics callback.
 */
export class ShaderRegistry {
  private modules = new Map<string, GPUShaderModule>();

  constructor(
    private readonly device: Pick<GPUDevice, "createShaderModule">,
    private readonly onMessage: (m: ShaderMessage) => void = () => {},
  ) {}

  get(name: string, code: string): GPUShaderModule {
    const existing = this.modules.get(name);
    if (existing) return existing;
    const module = this.device.createShaderModule({ label: name, code });
    this.modules.set(name, module);
    module
      .getCompilationInfo()
      .then((info) => {
        for (const m of info.messages) {
          this.onMessage({
            shader: name,
            type: m.type,
            message: m.message,
            line: m.lineNum,
            column: m.linePos,
          });
        }
      })
      // Rejects if the device goes away first (e.g. page closing); nothing to report.
      .catch(() => {});
    return module;
  }

  get size(): number {
    return this.modules.size;
  }
}
