export interface Project {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  githubUrl: string;
  tags: string[];
}

export interface Skill {
  name: string;
  percentage: number;
  icon: string;
  color: string;
}

export interface StatItem {
  value: number;
  label: string;
  suffix?: string;
}
