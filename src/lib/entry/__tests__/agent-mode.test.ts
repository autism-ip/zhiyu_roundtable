/**
 * Agent Mode Service Tests
 * [INPUT]: 测试 AgentModeService 的所有 public 方法
 * [OUTPUT]: 验证行为正确性
 * [POS]: lib/entry/__tests__/agent-mode.test.ts
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AgentModeService,
  AgentMode,
  PRESET_MODES,
  getAgentModeService,
  resetAgentModeService,
} from '../agent-mode';

describe('AgentModeService', () => {
  let service: AgentModeService;

  beforeEach(() => {
    // 每个测试前创建新实例
    service = new AgentModeService();
  });

  afterEach(() => {
    // 每个测试后重置单例
    resetAgentModeService();
  });

  // ============================================
  // 1. createDefaultMode
  // ============================================
  describe('createDefaultMode', () => {
    it('应返回正确的默认模式（human模式）', () => {
      const mode = service.createDefaultMode();
      expect(mode.mode).toBe('human');
      expect(mode.autoAction).toBe(false);
      expect(mode.humanIntervention).toBe(false);
      expect(mode.behaviorLogging).toBe(false);
    });

    it('应使用配置的默认值', () => {
      const customService = new AgentModeService({
        defaultMode: 'agent',
        defaultAgentId: 'agent-123',
        defaultAutoAction: true,
        defaultHumanIntervention: true,
        defaultBehaviorLogging: true,
      });
      const mode = customService.createDefaultMode();
      expect(mode.mode).toBe('agent');
      expect(mode.agentId).toBe('agent-123');
      expect(mode.autoAction).toBe(true);
      expect(mode.humanIntervention).toBe(true);
      expect(mode.behaviorLogging).toBe(true);
    });

    it('返回的模式应该是新对象，不影响内部状态', () => {
      const mode1 = service.createDefaultMode();
      const mode2 = service.createDefaultMode();
      expect(mode1).not.toBe(mode2);
      expect(mode1).toEqual(mode2);
    });
  });

  // ============================================
  // 2. getMode
  // ============================================
  describe('getMode', () => {
    it('应返回当前模式的副本', () => {
      const mode = service.getMode();
      expect(mode).toEqual(service.getMode());
      expect(mode).not.toBe(service.getMode()); // 应该是新对象
    });

    it('初始状态应为human模式', () => {
      const mode = service.getMode();
      expect(mode.mode).toBe('human');
    });
  });

  // ============================================
  // 3. switchToHumanMode
  // ============================================
  describe('switchToHumanMode', () => {
    it('应切换到人类模式', () => {
      // 先切换到 agent 模式
      service.switchToAgentAutonomous('agent-123');
      const mode = service.switchToHumanMode();

      expect(mode.mode).toBe('human');
      expect(mode.autoAction).toBe(false);
      expect(mode.humanIntervention).toBe(false);
      expect(mode.behaviorLogging).toBe(false);
    });

    it('切换后 isHumanMode 应返回 true', () => {
      service.switchToAgentAutonomous('agent-123');
      service.switchToHumanMode();
      expect(service.isHumanMode()).toBe(true);
    });
  });

  // ============================================
  // 4. switchToAgentAutonomous
  // ============================================
  describe('switchToAgentAutonomous', () => {
    it('应切换到 Agent 完全自主模式', () => {
      const mode = service.switchToAgentAutonomous('agent-456');

      expect(mode.mode).toBe('agent');
      expect(mode.agentId).toBe('agent-456');
      expect(mode.autoAction).toBe(true);
      expect(mode.humanIntervention).toBe(false);
      expect(mode.behaviorLogging).toBe(true);
    });

    it('切换后 isAgentMode 应返回 true', () => {
      service.switchToAgentAutonomous('agent-789');
      expect(service.isAgentMode()).toBe(true);
    });
  });

  // ============================================
  // 5. switchToAgentWithIntervention
  // ============================================
  describe('switchToAgentWithIntervention', () => {
    it('应切换到 Agent 可干预模式', () => {
      const mode = service.switchToAgentWithIntervention('agent-999');

      expect(mode.mode).toBe('agent');
      expect(mode.agentId).toBe('agent-999');
      expect(mode.autoAction).toBe(true);
      expect(mode.humanIntervention).toBe(true);
      expect(mode.behaviorLogging).toBe(true);
    });

    it('可干预模式下 canHumanIntervention 应返回 true', () => {
      service.switchToAgentWithIntervention('agent-000');
      expect(service.canHumanIntervention()).toBe(true);
    });
  });

  // ============================================
  // 6. isAgentMode / isHumanMode
  // ============================================
  describe('isAgentMode / isHumanMode', () => {
    it('human 模式下 isAgentMode 应返回 false', () => {
      expect(service.isAgentMode()).toBe(false);
      expect(service.isHumanMode()).toBe(true);
    });

    it('agent 模式下 isAgentMode 应返回 true', () => {
      service.switchToAgentAutonomous('agent-test');
      expect(service.isAgentMode()).toBe(true);
      expect(service.isHumanMode()).toBe(false);
    });
  });

  // ============================================
  // 7. enableAutoAction / disableAutoAction
  // ============================================
  describe('enableAutoAction / disableAutoAction', () => {
    it('enableAutoAction 应启用自动行动', () => {
      service.switchToHumanMode();
      const mode = service.enableAutoAction();

      expect(mode.autoAction).toBe(true);
      expect(service.isAutoActionEnabled()).toBe(true);
    });

    it('disableAutoAction 应禁用自动行动', () => {
      service.switchToAgentAutonomous('agent-test');
      const mode = service.disableAutoAction();

      expect(mode.autoAction).toBe(false);
      expect(service.isAutoActionEnabled()).toBe(false);
    });
  });

  // ============================================
  // 8. enableHumanIntervention / disableHumanIntervention
  // ============================================
  describe('enableHumanIntervention / disableHumanIntervention', () => {
    it('enableHumanIntervention 应启用人类干预', () => {
      service.switchToAgentAutonomous('agent-test');
      const mode = service.enableHumanIntervention();

      expect(mode.humanIntervention).toBe(true);
      expect(service.canHumanIntervention()).toBe(true);
    });

    it('disableHumanIntervention 应禁用人类干预', () => {
      service.switchToAgentWithIntervention('agent-test');
      const mode = service.disableHumanIntervention();

      expect(mode.humanIntervention).toBe(false);
      expect(service.canHumanIntervention()).toBe(false);
    });
  });

  // ============================================
  // 9. enableBehaviorLogging / disableBehaviorLogging
  // ============================================
  describe('enableBehaviorLogging / disableBehaviorLogging', () => {
    it('enableBehaviorLogging 应启用行为日志', () => {
      service.disableBehaviorLogging();
      const mode = service.enableBehaviorLogging();

      expect(mode.behaviorLogging).toBe(true);
      expect(service.isBehaviorLoggingEnabled()).toBe(true);
    });

    it('disableBehaviorLogging 应禁用行为日志', () => {
      service.enableBehaviorLogging();
      const mode = service.disableBehaviorLogging();

      expect(mode.behaviorLogging).toBe(false);
      expect(service.isBehaviorLoggingEnabled()).toBe(false);
    });
  });

  // ============================================
  // 10. canHumanIntervention
  // ============================================
  describe('canHumanIntervention', () => {
    it('human 模式下应返回 false', () => {
      expect(service.canHumanIntervention()).toBe(false);
    });

    it('agent 完全自主模式下应返回 false', () => {
      service.switchToAgentAutonomous('agent-test');
      expect(service.canHumanIntervention()).toBe(false);
    });

    it('agent 可干预模式下应返回 true', () => {
      service.switchToAgentWithIntervention('agent-test');
      expect(service.canHumanIntervention()).toBe(true);
    });
  });

  // ============================================
  // 11. validateMode
  // ============================================
  describe('validateMode', () => {
    it('有效的人类模式应通过验证', () => {
      const mode: AgentMode = {
        mode: 'human',
        autoAction: false,
        humanIntervention: false,
        behaviorLogging: false,
      };
      const result = service.validateMode(mode);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('有效的 agent 模式应通过验证', () => {
      const mode: AgentMode = {
        mode: 'agent',
        agentId: 'agent-123',
        autoAction: true,
        humanIntervention: false,
        behaviorLogging: true,
      };
      const result = service.validateMode(mode);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('agent 模式无 agentId 应失败验证', () => {
      const mode: AgentMode = {
        mode: 'agent',
        autoAction: true,
        humanIntervention: false,
        behaviorLogging: true,
      };
      const result = service.validateMode(mode);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Agent 模式必须提供 agentId');
    });

    it('关闭自动行动时开启人类干预应失败验证', () => {
      const mode: AgentMode = {
        mode: 'agent',
        agentId: 'agent-123',
        autoAction: false,
        humanIntervention: true,
        behaviorLogging: true,
      };
      const result = service.validateMode(mode);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('关闭自动行动时，人类干预无意义');
    });

    it('多个错误应全部返回', () => {
      const mode: AgentMode = {
        mode: 'agent',
        autoAction: false,
        humanIntervention: true,
        behaviorLogging: false,
      };
      const result = service.validateMode(mode);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  // ============================================
  // 12. applyPreset
  // ============================================
  describe('applyPreset', () => {
    it('应用 HUMAN 预设应切换到人类模式', () => {
      service.switchToAgentAutonomous('agent-test');
      const mode = service.applyPreset('HUMAN');

      expect(mode.mode).toBe('human');
      expect(mode.autoAction).toBe(false);
    });

    it('应用 AGENT_FULLY_AUTONOMOUS 预设应切换到完全自主模式', () => {
      const mode = service.applyPreset('AGENT_FULLY_AUTONOMOUS', 'preset-agent-1');

      expect(mode.mode).toBe('agent');
      expect(mode.agentId).toBe('preset-agent-1');
      expect(mode.autoAction).toBe(true);
      expect(mode.humanIntervention).toBe(false);
      expect(mode.behaviorLogging).toBe(true);
    });

    it('应用 AGENT_WITH_INTERVENTION 预设应切换到可干预模式', () => {
      const mode = service.applyPreset('AGENT_WITH_INTERVENTION', 'preset-agent-2');

      expect(mode.mode).toBe('agent');
      expect(mode.agentId).toBe('preset-agent-2');
      expect(mode.autoAction).toBe(true);
      expect(mode.humanIntervention).toBe(true);
      expect(mode.behaviorLogging).toBe(true);
    });

    it('HUMAN 预设不需要 agentId', () => {
      const mode = service.applyPreset('HUMAN');
      expect(mode.agentId).toBeUndefined();
    });
  });

  // ============================================
  // 13. reset
  // ============================================
  describe('reset', () => {
    it('应重置为默认模式', () => {
      // 先切换到其他模式
      service.switchToAgentWithIntervention('agent-to-reset');
      service.enableBehaviorLogging();

      // 重置
      const mode = service.reset();

      expect(mode.mode).toBe('human');
      expect(mode.agentId).toBeUndefined();
      expect(mode.autoAction).toBe(false);
    });

    it('重置后 isHumanMode 应返回 true', () => {
      service.switchToAgentAutonomous('agent-test');
      service.reset();
      expect(service.isHumanMode()).toBe(true);
    });
  });

  // ============================================
  // 14. serialize / deserialize
  // ============================================
  describe('serialize / deserialize', () => {
    it('serialize 应返回 JSON 字符串', () => {
      const json = service.serialize();
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('deserialize 应恢复有效的 agent 模式', () => {
      service.switchToAgentAutonomous('agent-serialize-test');
      const json = service.serialize();

      // 创建新服务实例来测试反序列化
      const newService = new AgentModeService();
      newService.deserialize(json);

      const mode = newService.getMode();
      expect(mode.mode).toBe('agent');
      expect(mode.agentId).toBe('agent-serialize-test');
    });

    it('deserialize 无效数据应返回默认模式', () => {
      const newService = new AgentModeService();
      const invalidJson = '{ invalid json }';

      const mode = newService.deserialize(invalidJson);
      expect(mode.mode).toBe('human'); // 默认模式
    });

    it('deserialize 验证失败应返回默认模式', () => {
      const newService = new AgentModeService();
      // agent 模式但没有 agentId，验证会失败
      const invalidMode = JSON.stringify({
        mode: 'agent',
        autoAction: true,
        humanIntervention: false,
        behaviorLogging: true,
      });

      const mode = newService.deserialize(invalidMode);
      expect(mode.mode).toBe('human'); // 默认模式
    });
  });

  // ============================================
  // 15. 模式切换后 getMode 应返回新模式
  // ============================================
  describe('模式切换后 getMode 应返回新模式', () => {
    it('switchToAgentAutonomous 后 getMode 应返回新的 agent 模式', () => {
      const mode1 = service.getMode();
      service.switchToAgentAutonomous('new-agent');
      const mode2 = service.getMode();

      expect(mode1.mode).toBe('human');
      expect(mode2.mode).toBe('agent');
      expect(mode2.agentId).toBe('new-agent');
    });

    it('switchToHumanMode 后 getMode 应返回新的人类模式', () => {
      service.switchToAgentAutonomous('agent-to-switch');
      const mode1 = service.getMode();

      service.switchToHumanMode();
      const mode2 = service.getMode();

      expect(mode1.mode).toBe('agent');
      expect(mode2.mode).toBe('human');
    });

    it('applyPreset 后 getMode 应返回新的预设模式', () => {
      const mode1 = service.getMode();
      service.applyPreset('AGENT_WITH_INTERVENTION', 'preset-test');

      const mode2 = service.getMode();
      expect(mode1.mode).toBe('human');
      expect(mode2.mode).toBe('agent');
      expect(mode2.agentId).toBe('preset-test');
    });

    it('reset 后 getMode 应返回默认模式', () => {
      service.switchToAgentWithIntervention('agent-before-reset');
      service.reset();

      const mode = service.getMode();
      expect(mode.mode).toBe('human');
    });
  });

  // ============================================
  // PRESET_MODES 常量
  // ============================================
  describe('PRESET_MODES', () => {
    it('HUMAN 预设应包含正确的值', () => {
      expect(PRESET_MODES.HUMAN).toEqual({
        mode: 'human',
        autoAction: false,
        humanIntervention: false,
        behaviorLogging: false,
      });
    });

    it('AGENT_FULLY_AUTONOMOUS 预设应包含正确的值', () => {
      expect(PRESET_MODES.AGENT_FULLY_AUTONOMOUS).toEqual({
        mode: 'agent',
        autoAction: true,
        humanIntervention: false,
        behaviorLogging: true,
      });
    });

    it('AGENT_WITH_INTERVENTION 预设应包含正确的值', () => {
      expect(PRESET_MODES.AGENT_WITH_INTERVENTION).toEqual({
        mode: 'agent',
        autoAction: true,
        humanIntervention: true,
        behaviorLogging: true,
      });
    });
  });

  // ============================================
  // 单例模式测试
  // ============================================
  describe('单例模式', () => {
    it('getAgentModeService 应返回单例', () => {
      const instance1 = getAgentModeService();
      const instance2 = getAgentModeService();
      expect(instance1).toBe(instance2);
    });

    it('resetAgentModeService 应重置单例', () => {
      const instance1 = getAgentModeService();
      resetAgentModeService();
      const instance2 = getAgentModeService();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================
  // 边缘用例
  // ============================================
  describe('边缘用例', () => {
    it('连续多次切换模式应正确工作', () => {
      service.switchToAgentAutonomous('agent-1');
      expect(service.isAgentMode()).toBe(true);

      service.switchToHumanMode();
      expect(service.isHumanMode()).toBe(true);

      service.switchToAgentWithIntervention('agent-2');
      expect(service.isAgentMode()).toBe(true);
      expect(service.canHumanIntervention()).toBe(true);

      service.switchToAgentAutonomous('agent-3');
      expect(service.isAgentMode()).toBe(true);
      expect(service.canHumanIntervention()).toBe(false);
    });

    it('多次调用 enable/disable 方法应正确切换状态', () => {
      service.switchToAgentAutonomous('agent-test');

      service.disableAutoAction();
      expect(service.isAutoActionEnabled()).toBe(false);

      service.enableAutoAction();
      expect(service.isAutoActionEnabled()).toBe(true);

      service.disableBehaviorLogging();
      expect(service.isBehaviorLoggingEnabled()).toBe(false);

      service.enableBehaviorLogging();
      expect(service.isBehaviorLoggingEnabled()).toBe(true);
    });

    it('switchMode 应直接切换到指定模式', () => {
      const customMode: AgentMode = {
        mode: 'agent',
        agentId: 'custom-agent',
        autoAction: false,
        humanIntervention: true,
        behaviorLogging: true,
      };

      const result = service.switchMode(customMode);

      expect(result.mode).toBe('agent');
      expect(result.agentId).toBe('custom-agent');
      expect(result.autoAction).toBe(false);
    });

    it('setUserId 应设置用户ID（不直接影响模式）', () => {
      service.setUserId('user-123');
      const mode = service.getMode();
      // setUserId 不影响模式，只是记录
      expect(mode.mode).toBe('human');
    });
  });
});
