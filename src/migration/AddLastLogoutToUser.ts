// migrations/1234567890000-AddLastLogoutToUser.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastLogoutToUser1234567890000 implements MigrationInterface {
    name = 'AddLastLogoutToUser1234567890000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "lastLogout" TIMESTAMP WITH TIME ZONE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN "lastLogout"
        `);
    }
}