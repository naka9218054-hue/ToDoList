/**
 * ToDoList Web App - Playwright E2E Automated Test Suite
 * 
 * Run test:
 *   npx playwright test test_e2e.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

test.describe('ToDoList Web App E2E Test Suite', () => {

    test.beforeEach(async ({ page }) => {
        // 1. ページへのアクセス
        await page.goto(BASE_URL);
        await expect(page).toHaveTitle(/ToDo List アプリ/);
    });

    test('1. 初期表示の要素検証', async ({ page }) => {
        // ヘッダータイトルの検証
        const headerTitle = page.locator('.brand-section h1');
        await expect(headerTitle).toHaveText('TaskFlow');

        // 入力フィールドの存在確認
        const inputField = page.locator('#task-title-input');
        await expect(inputField).toBeVisible();
    });

    test('2. タスク追加フロー', async ({ page }) => {
        const testTaskTitle = `自動テストタスク_${Date.now()}`;

        // タスク名を入力
        await page.fill('#task-title-input', testTaskTitle);

        // カテゴリと優先度を選択
        await page.selectOption('#task-category-select', '仕事');
        await page.selectOption('#task-priority-select', 'high');

        // 「追加する」ボタンをクリック
        await page.click('#task-form button[type="submit"]');

        // タスク一覧に新タスクが表示されたことを検証
        const newTaskCard = page.locator(`.task-card:has-text("${testTaskTitle}")`);
        await expect(newTaskCard).toBeVisible({ timeout: 5000 });
    });

    test('3. 検索フィルター動作テスト', async ({ page }) => {
        const searchInput = page.locator('#search-input');
        await searchInput.fill('立山');

        // 検索結果の絞り込み検証
        const taskCards = page.locator('.task-card');
        await expect(taskCards.first()).toContainText('立山');
    });

    test('4. フィルタートグル動作（すべて / 未完了 / 完了済み）', async ({ page }) => {
        // 「未完了」フィルタークリック
        await page.click('.filter-pills button[data-filter="active"]');
        
        // アクティブクラスが付与されたか確認
        const activeFilterBtn = page.locator('.filter-pills button[data-filter="active"]');
        await expect(activeFilterBtn).toHaveClass(/active/);
    });

    test('5. スケジュール表示切り替えとマトリックス・日付なしタスク検証', async ({ page }) => {
        // 1. スケジュール表示ボタンをクリック
        await page.click('#view-mode-schedule');
        const schedContainer = page.locator('#schedule-view-container');
        await expect(schedContainer).toBeVisible();

        // 2. テーブルヘッダーに1週間（日付）と2,3,4週まとめ項目が表示されているか検証
        const schedTable = page.locator('#schedule-table');
        await expect(schedTable).toBeVisible();
        await expect(page.locator('#schedule-table-header th').first()).toContainText('Doリスト');

        const weekHeaders = page.locator('.col-week-header');
        await expect(weekHeaders).toHaveCount(3);
        await expect(weekHeaders.nth(0)).toContainText('第2週');
        await expect(weekHeaders.nth(1)).toContainText('第3週');
        await expect(weekHeaders.nth(2)).toContainText('第4週');

        // 3. 日付指定なしのタスクエリアが表示されているか検証
        const unscheduledSection = page.locator('.unscheduled-section');
        await expect(unscheduledSection).toBeVisible();

        // 4. リスト表示に戻す
        await page.click('#view-mode-list');
        await expect(schedContainer).toBeHidden();
        await expect(page.locator('#task-list-container')).toBeVisible();
    });

});
