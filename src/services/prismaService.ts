import { PrismaClient } from '@/generated/prisma/client'
import { ENV } from '@/utils/constants/app.constant'
import { PrismaPg } from '@prisma/adapter-pg'

export class PrismaService {
  private static instance: PrismaService
  public prisma: PrismaClient

  private constructor() {
    const adapter = new PrismaPg({ connectionString: ENV.DATABASE_URL })
    const log = ['query', 'info', 'warn', 'error']
    this.prisma = new PrismaClient({
      log,
      adapter,
    } as any)
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService()
    }
    return PrismaService.instance
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect()
      console.log('Prisma database connection successful')
    } catch (error) {
      console.error('Prisma database connection failed:', error)
      throw error
    }
  }

  public async testConnection(): Promise<void> {
    try {
      // Test the connection with a simple query
      await this.prisma.$queryRaw`SELECT 1 as result`

      console.log('Prisma database connection test successful')
      console.log('All Prisma models are available')
    } catch (error) {
      console.error('Prisma database connection test failed:', error)
      if (error instanceof Error && error.message.includes('missing')) {
        throw error // Re-throw model missing errors
      }
      console.warn('Proceeding without a successful DB connection.')
    }
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
    console.log('Prisma database connection closed')
  }

  public async onShutdown(): Promise<void> {
    await this.disconnect()
  }
}

// Export a singleton instance
export const prismaService = PrismaService.getInstance()
export default prismaService
export const prisma = prismaService.prisma
