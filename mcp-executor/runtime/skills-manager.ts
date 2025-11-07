/**
 * Skills Manager
 * Persists and manages reusable code snippets (skills)
 */

import type { Skill } from '@mcp/types';

export class SkillsManager {
  private skillsDir: string;
  private skills: Map<string, Skill> = new Map();

  constructor(skillsDir: string = './skills') {
    this.skillsDir = skillsDir;
  }

  /**
   * Initialize skills manager (load existing skills)
   */
  async initialize(): Promise<void> {
    try {
      // Ensure skills directory exists
      await Deno.mkdir(this.skillsDir, { recursive: true });

      // Load existing skills
      for await (const entry of Deno.readDir(this.skillsDir)) {
        if (entry.isFile && entry.name.endsWith('.ts')) {
          const skillId = entry.name.replace('.ts', '');
          await this.loadSkill(skillId);
        }
      }

      console.log(`Loaded ${this.skills.size} skills`);
    } catch (error) {
      console.error('Failed to initialize skills manager:', error);
    }
  }

  /**
   * Save a skill
   */
  async saveSkill(skill: Skill): Promise<void> {
    const filePath = `${this.skillsDir}/${skill.id}.ts`;

    // Create skill file with metadata
    const content = this.serializeSkill(skill);

    await Deno.writeTextFile(filePath, content);
    this.skills.set(skill.id, skill);

    console.log(`Saved skill: ${skill.name} (${skill.id})`);
  }

  /**
   * Load a skill
   */
  async loadSkill(skillId: string): Promise<Skill | null> {
    try {
      const filePath = `${this.skillsDir}/${skillId}.ts`;
      const content = await Deno.readTextFile(filePath);
      const skill = this.deserializeSkill(content, skillId);

      this.skills.set(skillId, skill);
      return skill;
    } catch (error) {
      console.error(`Failed to load skill ${skillId}:`, error);
      return null;
    }
  }

  /**
   * Get a skill by ID
   */
  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Search skills
   */
  searchSkills(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.skills.values()).filter(
      skill =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * List all skills
   */
  listSkills(): Skill[] {
    return Array.from(this.skills.values()).sort(
      (a, b) => b.usageCount - a.usageCount
    );
  }

  /**
   * Delete a skill
   */
  async deleteSkill(skillId: string): Promise<boolean> {
    try {
      const filePath = `${this.skillsDir}/${skillId}.ts`;
      await Deno.remove(filePath);
      this.skills.delete(skillId);
      console.log(`Deleted skill: ${skillId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete skill ${skillId}:`, error);
      return false;
    }
  }

  /**
   * Increment skill usage count
   */
  async incrementUsage(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.usageCount++;
      await this.saveSkill(skill);
    }
  }

  /**
   * Serialize skill to file content
   */
  private serializeSkill(skill: Skill): string {
    return `/**
 * Skill: ${skill.name}
 * Description: ${skill.description}
 * Created: ${skill.createdAt.toISOString()}
 * Usage Count: ${skill.usageCount}
 * Tags: ${skill.tags.join(', ')}
 */

${skill.code}
`;
  }

  /**
   * Deserialize skill from file content
   */
  private deserializeSkill(content: string, id: string): Skill {
    // Extract metadata from comments
    const nameMatch = content.match(/\* Skill: (.+)/);
    const descMatch = content.match(/\* Description: (.+)/);
    const createdMatch = content.match(/\* Created: (.+)/);
    const usageMatch = content.match(/\* Usage Count: (\d+)/);
    const tagsMatch = content.match(/\* Tags: (.+)/);

    // Extract code (everything after metadata comments)
    const codeStart = content.indexOf('*/') + 2;
    const code = content.slice(codeStart).trim();

    return {
      id,
      name: nameMatch?.[1] || id,
      description: descMatch?.[1] || '',
      code,
      createdAt: createdMatch?.[1] ? new Date(createdMatch[1]) : new Date(),
      usageCount: usageMatch?.[1] ? parseInt(usageMatch[1], 10) : 0,
      tags: tagsMatch?.[1]?.split(',').map(t => t.trim()) || [],
    };
  }

  /**
   * Create a new skill from code
   */
  createSkill(
    name: string,
    description: string,
    code: string,
    tags: string[] = []
  ): Skill {
    const id = this.generateSkillId(name);

    return {
      id,
      name,
      description,
      code,
      createdAt: new Date(),
      usageCount: 0,
      tags,
    };
  }

  /**
   * Generate a unique skill ID
   */
  private generateSkillId(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let id = base;
    let counter = 1;

    while (this.skills.has(id)) {
      id = `${base}-${counter}`;
      counter++;
    }

    return id;
  }
}
