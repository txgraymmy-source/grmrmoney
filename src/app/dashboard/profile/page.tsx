import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      agencyName: true,
      phone: true,
      createdAt: true,
    },
  })

  return user
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await getUserProfile(session.user.id)

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Профиль</h1>
        <p className="text-gray-400 mt-1">
          Настройки вашего аккаунта
        </p>
      </div>

      {/* Account Info */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Информация об аккаунте</CardTitle>
          <CardDescription>Email адрес для входа</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white font-medium">{user.email}</p>
            </div>
            <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-lg">
              Подтвержден
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <ProfileForm
        initialData={{
          name: user.name || '',
          agencyName: user.agencyName || '',
          phone: user.phone || '',
        }}
      />
    </div>
  )
}
